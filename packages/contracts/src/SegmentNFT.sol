// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SegmentNFT
 * @dev ERC-721 NFT for Infinite Life segments
 * Each segment represents a sequence of generations in the Game of Life simulation
 */
contract SegmentNFT is ERC721, Ownable {
    using Strings for uint256;

    // ===========================================
    // Constants
    // ===========================================
    uint8 public constant BOARD_SIZE = 64;

    // ===========================================
    // Generation Range (configurable by owner)
    // ===========================================
    uint8 public minGenerations = 5;
    uint8 public maxGenerations = 30;

    // ===========================================
    // Global Board State
    // ===========================================
    uint256 public currentGen;           // Latest completed generation number
    bytes32 public currentStateRoot;     // Current board state hash
    string public currentStateCID;       // IPFS CID for current state
    bytes32 public immutable rulesetHash; // Hash of palette + rules (immutable)

    // ===========================================
    // Segment Structure
    // ===========================================
    struct Segment {
        address buyer;
        uint256 fid;              // Farcaster ID
        uint256 startGen;
        uint256 nGenerations;     // 5-30
        bytes32 startStateRoot;
        string startStateCID;
        bytes cellsEncoded;       // Injected cell data (on-chain storage)
        bytes32 cellsHash;        // keccak256(cellsEncoded)
        bool finalized;
        bytes32 endStateRoot;
        string endStateCID;
        string metadataURI;       // IPFS metadata URI
    }

    mapping(uint256 => Segment) public segments;
    uint256 public nextTokenId;

    // ===========================================
    // Checkpoints (256 generation boundaries)
    // ===========================================
    mapping(uint256 => bytes32) public checkpointRoots;
    mapping(uint256 => string) public checkpointCIDs;

    // ===========================================
    // Fee Configuration
    // ===========================================
    uint256 public baseFee;      // Base fee per segment
    uint256 public perGenFee;    // Fee per generation
    uint256 public perCellFee;   // Fee per cell (can be 0)

    // ===========================================
    // Access Control
    // ===========================================
    address public finalizer;

    // ===========================================
    // Events
    // ===========================================
    event SegmentPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 indexed fid,
        uint256 startGen,
        uint256 nGenerations,
        bytes32 startStateRoot,
        bytes32 cellsHash
    );

    event SegmentFinalized(
        uint256 indexed tokenId,
        bytes32 endStateRoot,
        string endStateCID,
        string metadataURI
    );

    event CheckpointRecorded(
        uint256 indexed boundaryGen,
        bytes32 boundaryRoot,
        string boundaryStateCID
    );

    event FeesUpdated(
        uint256 baseFee,
        uint256 perGenFee,
        uint256 perCellFee
    );

    event GenerationRangeUpdated(
        uint8 minGenerations,
        uint8 maxGenerations
    );

    event FinalizerUpdated(address indexed newFinalizer);

    // ===========================================
    // Modifiers
    // ===========================================
    modifier onlyFinalizer() {
        require(msg.sender == finalizer, "SegmentNFT: caller is not finalizer");
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================
    constructor(
        address _owner,
        address _finalizer,
        bytes32 _rulesetHash,
        bytes32 _initialStateRoot,
        string memory _initialStateCID,
        uint256 _baseFee,
        uint256 _perGenFee,
        uint256 _perCellFee
    ) ERC721("Infinite Life Segment", "ILS") Ownable(_owner) {
        finalizer = _finalizer;
        rulesetHash = _rulesetHash;
        currentStateRoot = _initialStateRoot;
        currentStateCID = _initialStateCID;
        currentGen = 0;
        nextTokenId = 1;

        baseFee = _baseFee;
        perGenFee = _perGenFee;
        perCellFee = _perCellFee;
    }

    // ===========================================
    // External Functions
    // ===========================================

    /**
     * @dev Purchase a segment
     * @param nGenerations Number of generations (5-30)
     * @param cellsEncoded Encoded cells data (3 bytes per cell: x, y, colorIndex)
     * @param fid Farcaster ID
     * @return tokenId The ID of the minted segment NFT
     */
    function buySegment(
        uint8 nGenerations,
        bytes calldata cellsEncoded,
        uint256 fid
    ) external payable returns (uint256 tokenId) {
        require(
            nGenerations >= minGenerations && nGenerations <= maxGenerations,
            "SegmentNFT: invalid generation count"
        );

        // Validate cell count (max = nGenerations * 9)
        uint256 cellCount = cellsEncoded.length / 3;
        require(
            cellsEncoded.length % 3 == 0,
            "SegmentNFT: invalid cells encoding"
        );
        require(
            cellCount <= uint256(nGenerations) * 9,
            "SegmentNFT: too many cells"
        );

        // Validate cell coordinates
        for (uint256 i = 0; i < cellCount; i++) {
            uint8 x = uint8(cellsEncoded[i * 3]);
            uint8 y = uint8(cellsEncoded[i * 3 + 1]);
            uint8 colorIndex = uint8(cellsEncoded[i * 3 + 2]);
            require(x < BOARD_SIZE && y < BOARD_SIZE, "SegmentNFT: cell out of bounds");
            require(colorIndex < 16, "SegmentNFT: invalid color index");
        }

        // Calculate and verify fee
        uint256 fee = calculateFee(nGenerations, cellCount);
        require(msg.value >= fee, "SegmentNFT: insufficient payment");

        // Create segment
        tokenId = nextTokenId++;
        uint256 startGen = currentGen + 1;
        bytes32 cellsHash = keccak256(cellsEncoded);

        segments[tokenId] = Segment({
            buyer: msg.sender,
            fid: fid,
            startGen: startGen,
            nGenerations: nGenerations,
            startStateRoot: currentStateRoot,
            startStateCID: currentStateCID,
            cellsEncoded: cellsEncoded,
            cellsHash: cellsHash,
            finalized: false,
            endStateRoot: bytes32(0),
            endStateCID: "",
            metadataURI: ""
        });

        // Mint NFT
        _mint(msg.sender, tokenId);

        emit SegmentPurchased(
            tokenId,
            msg.sender,
            fid,
            startGen,
            nGenerations,
            currentStateRoot,
            cellsHash
        );

        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }

    /**
     * @dev Finalize a segment (finalizer only)
     * @param tokenId The segment token ID
     * @param endStateRoot The final state root after simulation
     * @param endStateCID IPFS CID of the end state
     * @param metadataURI IPFS URI for the metadata JSON
     */
    function finalizeSegment(
        uint256 tokenId,
        bytes32 endStateRoot,
        string calldata endStateCID,
        string calldata metadataURI
    ) external onlyFinalizer {
        Segment storage seg = segments[tokenId];
        require(seg.buyer != address(0), "SegmentNFT: segment does not exist");
        require(!seg.finalized, "SegmentNFT: already finalized");

        seg.finalized = true;
        seg.endStateRoot = endStateRoot;
        seg.endStateCID = endStateCID;
        seg.metadataURI = metadataURI;

        // Update global state
        currentGen = seg.startGen + seg.nGenerations - 1;
        currentStateRoot = endStateRoot;
        currentStateCID = endStateCID;

        emit SegmentFinalized(tokenId, endStateRoot, endStateCID, metadataURI);
    }

    /**
     * @dev Record a checkpoint at 256 generation boundaries (finalizer only)
     * @param boundaryGen The boundary generation number (256, 512, 768...)
     * @param boundaryRoot The state root at the boundary
     * @param boundaryStateCID IPFS CID of the state at the boundary
     */
    function recordCheckpoint(
        uint256 boundaryGen,
        bytes32 boundaryRoot,
        string calldata boundaryStateCID
    ) external onlyFinalizer {
        require(boundaryGen % 256 == 0, "SegmentNFT: not a 256 boundary");
        require(checkpointRoots[boundaryGen] == bytes32(0), "SegmentNFT: checkpoint exists");

        checkpointRoots[boundaryGen] = boundaryRoot;
        checkpointCIDs[boundaryGen] = boundaryStateCID;

        emit CheckpointRecorded(boundaryGen, boundaryRoot, boundaryStateCID);
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    /**
     * @dev Update fee settings (owner only)
     */
    function setFees(
        uint256 _baseFee,
        uint256 _perGenFee,
        uint256 _perCellFee
    ) external onlyOwner {
        baseFee = _baseFee;
        perGenFee = _perGenFee;
        perCellFee = _perCellFee;

        emit FeesUpdated(_baseFee, _perGenFee, _perCellFee);
    }

    /**
     * @dev Update generation range (owner only)
     */
    function setGenerationRange(
        uint8 _minGenerations,
        uint8 _maxGenerations
    ) external onlyOwner {
        require(_minGenerations > 0, "SegmentNFT: min must be > 0");
        require(_maxGenerations >= _minGenerations, "SegmentNFT: max must be >= min");
        minGenerations = _minGenerations;
        maxGenerations = _maxGenerations;

        emit GenerationRangeUpdated(_minGenerations, _maxGenerations);
    }

    /**
     * @dev Update finalizer address (owner only)
     */
    function setFinalizer(address _finalizer) external onlyOwner {
        require(_finalizer != address(0), "SegmentNFT: invalid finalizer");
        finalizer = _finalizer;

        emit FinalizerUpdated(_finalizer);
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "SegmentNFT: no balance");
        payable(owner()).transfer(balance);
    }

    // ===========================================
    // View Functions
    // ===========================================

    /**
     * @dev Calculate fee for a segment
     * @param nGenerations Number of generations
     * @param cellCount Number of cells
     * @return Total fee in wei
     */
    function calculateFee(
        uint8 nGenerations,
        uint256 cellCount
    ) public view returns (uint256) {
        return baseFee + (uint256(nGenerations) * perGenFee) + (cellCount * perCellFee);
    }

    /**
     * @dev Get segment data
     */
    function getSegment(uint256 tokenId) external view returns (Segment memory) {
        return segments[tokenId];
    }

    /**
     * @dev Get cells data for a segment
     */
    function getSegmentCells(uint256 tokenId) external view returns (bytes memory) {
        return segments[tokenId].cellsEncoded;
    }

    /**
     * @dev Returns token URI (hybrid: pending=on-chain, revealed=IPFS)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SegmentNFT: token does not exist");

        Segment memory seg = segments[tokenId];

        if (seg.finalized) {
            // Revealed: return IPFS metadata
            return seg.metadataURI;
        } else {
            // Pending: build on-chain metadata
            return _buildPendingMetadata(tokenId, seg);
        }
    }

    // ===========================================
    // Internal Functions
    // ===========================================

    /**
     * @dev Build on-chain metadata for pending segments
     */
    function _buildPendingMetadata(
        uint256 tokenId,
        Segment memory seg
    ) internal pure returns (string memory) {
        uint256 endGen = seg.startGen + seg.nGenerations - 1;

        string memory json = string(abi.encodePacked(
            '{"name":"Infinite Life Segment #', tokenId.toString(),
            '","description":"Pending segment - Generations ', seg.startGen.toString(),
            ' to ', endGen.toString(),
            '","attributes":[',
            '{"trait_type":"Status","value":"pending"},',
            '{"trait_type":"Start Generation","value":', seg.startGen.toString(), '},',
            '{"trait_type":"Generations","value":', seg.nGenerations.toString(), '},',
            '{"trait_type":"Farcaster FID","value":', seg.fid.toString(), '}',
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
}
