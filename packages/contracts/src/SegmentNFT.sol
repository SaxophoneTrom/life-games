// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SegmentNFT
 * @dev ERC-721 NFT for Infinite Life segments (Independent Artwork)
 *
 * New Architecture (2025-12-15):
 * - Each segment is an INDEPENDENT artwork starting from empty board (generation 0)
 * - NO shared board state reference
 * - Immediate finalization on mint (no pending/finalize pipeline)
 * - Contribution to shared timeline is tracked via events for later Epoch generation
 *
 * Security Update (2025-12-19):
 * - Added signature verification to prevent direct contract calls
 * - Only trusted signer can authorize mints
 */
contract SegmentNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===========================================
    // Constants
    // ===========================================
    uint8 public constant BOARD_SIZE = 64;

    // ===========================================
    // Generation Range (configurable by owner)
    // ===========================================
    uint8 public minGenerations = 10;
    uint8 public maxGenerations = 30;

    // ===========================================
    // Ruleset Hash (immutable, for deterministic verification)
    // ===========================================
    bytes32 public immutable rulesetHash;

    // ===========================================
    // Trusted Signer for signature verification
    // ===========================================
    address public trustedSigner;

    // ===========================================
    // Nonce tracking for replay attack prevention
    // ===========================================
    mapping(address => uint256) public nonces;

    // ===========================================
    // Segment Structure (Simplified for Independent Artwork)
    // ===========================================
    struct Segment {
        address minter;           // Original minter address
        uint256 fid;              // Farcaster ID
        uint8 nGenerations;       // Number of generations (10-30)
        bytes32 cellsHash;        // keccak256(cellsEncoded)
        uint256 mintedAt;         // Block number when minted (for ordering in shared timeline)
    }

    mapping(uint256 => Segment) public segments;
    uint256 public nextTokenId;
    uint256 public totalGenerations; // Cumulative sum of all minted segments' generations

    // ===========================================
    // Fee Configuration
    // ===========================================
    uint256 public baseFee;      // Base fee per segment
    uint256 public perGenFee;    // Fee per generation
    uint256 public perCellFee;   // Fee per cell (can be 0)

    // ===========================================
    // Events
    // ===========================================

    /**
     * @dev Emitted when a new segment is minted
     * @param tokenId The ID of the minted segment
     * @param minter The address that minted the segment
     * @param fid Farcaster ID of the minter
     * @param nGenerations Number of generations in the segment
     * @param cellsHash Hash of the injected cells data
     */
    event SegmentMinted(
        uint256 indexed tokenId,
        address indexed minter,
        uint256 indexed fid,
        uint8 nGenerations,
        bytes32 cellsHash
    );

    /**
     * @dev Emitted with the actual cells data for reconstruction
     * @param tokenId The ID of the segment
     * @param cellsEncoded The encoded cells data (3 bytes per cell: x, y, colorIndex)
     */
    event SegmentCells(
        uint256 indexed tokenId,
        bytes cellsEncoded
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

    event TrustedSignerUpdated(address indexed newSigner);

    // ===========================================
    // Constructor
    // ===========================================
    constructor(
        address _owner,
        address _trustedSigner,
        bytes32 _rulesetHash,
        uint256 _baseFee,
        uint256 _perGenFee,
        uint256 _perCellFee
    ) ERC721("Game of Life on BASE Segment", "GOLSEG") Ownable(_owner) {
        trustedSigner = _trustedSigner;
        rulesetHash = _rulesetHash;
        nextTokenId = 1;

        baseFee = _baseFee;
        perGenFee = _perGenFee;
        perCellFee = _perCellFee;
    }

    // ===========================================
    // External Functions
    // ===========================================

    /**
     * @dev Mint a new segment with signature verification
     * @param nGenerations Number of generations (10-30)
     * @param cellsEncoded Encoded cells data (3 bytes per cell: x, y, colorIndex)
     * @param fid Farcaster ID
     * @param nonce Nonce for replay attack prevention
     * @param signature Signature from trusted signer
     * @return tokenId The ID of the minted segment NFT
     *
     * Note: The segment starts from an EMPTY board (generation 0), not from shared state.
     * This makes each segment an independent artwork that can be verified deterministically.
     */
    function mintSegmentWithSignature(
        uint8 nGenerations,
        bytes calldata cellsEncoded,
        uint256 fid,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant returns (uint256 tokenId) {
        // Verify nonce
        require(nonce == nonces[msg.sender], "SegmentNFT: invalid nonce");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            nGenerations,
            keccak256(cellsEncoded),
            fid,
            nonce,
            block.chainid,
            address(this)
        ));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == trustedSigner, "SegmentNFT: invalid signature");

        // Increment nonce
        nonces[msg.sender]++;

        // Validate generation count
        require(
            nGenerations >= minGenerations && nGenerations <= maxGenerations,
            "SegmentNFT: invalid generation count"
        );

        // Validate cell encoding (3 bytes per cell)
        require(
            cellsEncoded.length % 3 == 0,
            "SegmentNFT: invalid cells encoding"
        );

        // Cell count is unlimited (no maxCells restriction)
        uint256 cellCount = cellsEncoded.length / 3;

        // Validate each cell (duplicate check removed for gas efficiency - handled client-side)
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

        // Create segment (immediately finalized)
        tokenId = nextTokenId++;
        bytes32 cellsHash = keccak256(cellsEncoded);

        segments[tokenId] = Segment({
            minter: msg.sender,
            fid: fid,
            nGenerations: nGenerations,
            cellsHash: cellsHash,
            mintedAt: block.number
        });

        // Update cumulative generations
        totalGenerations += nGenerations;

        // Mint NFT
        _mint(msg.sender, tokenId);

        // Emit events for indexing and reconstruction
        emit SegmentMinted(
            tokenId,
            msg.sender,
            fid,
            nGenerations,
            cellsHash
        );

        // Emit cells data separately (allows reconstruction from events)
        emit SegmentCells(tokenId, cellsEncoded);

        // Refund excess payment using call
        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "SegmentNFT: refund failed");
        }
    }

    /**
     * @dev Legacy mint function - now restricted to owner only
     * Kept for emergency use or testing, but normal mints should use mintSegmentWithSignature
     */
    function mintSegment(
        uint8 nGenerations,
        bytes calldata cellsEncoded,
        uint256 fid
    ) external payable onlyOwner nonReentrant returns (uint256 tokenId) {
        // Validate generation count
        require(
            nGenerations >= minGenerations && nGenerations <= maxGenerations,
            "SegmentNFT: invalid generation count"
        );

        // Validate cell encoding (3 bytes per cell)
        require(
            cellsEncoded.length % 3 == 0,
            "SegmentNFT: invalid cells encoding"
        );

        uint256 cellCount = cellsEncoded.length / 3;

        // Validate each cell
        for (uint256 i = 0; i < cellCount; i++) {
            uint8 x = uint8(cellsEncoded[i * 3]);
            uint8 y = uint8(cellsEncoded[i * 3 + 1]);
            uint8 colorIndex = uint8(cellsEncoded[i * 3 + 2]);

            require(x < BOARD_SIZE && y < BOARD_SIZE, "SegmentNFT: cell out of bounds");
            require(colorIndex < 16, "SegmentNFT: invalid color index");
        }

        // Calculate fee (owner still pays fee)
        uint256 fee = calculateFee(nGenerations, cellCount);
        require(msg.value >= fee, "SegmentNFT: insufficient payment");

        // Create segment
        tokenId = nextTokenId++;
        bytes32 cellsHash = keccak256(cellsEncoded);

        segments[tokenId] = Segment({
            minter: msg.sender,
            fid: fid,
            nGenerations: nGenerations,
            cellsHash: cellsHash,
            mintedAt: block.number
        });

        totalGenerations += nGenerations;

        _mint(msg.sender, tokenId);

        emit SegmentMinted(tokenId, msg.sender, fid, nGenerations, cellsHash);
        emit SegmentCells(tokenId, cellsEncoded);

        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "SegmentNFT: refund failed");
        }
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    /**
     * @dev Update trusted signer address (owner only)
     */
    function setTrustedSigner(address _trustedSigner) external onlyOwner {
        require(_trustedSigner != address(0), "SegmentNFT: invalid signer");
        trustedSigner = _trustedSigner;
        emit TrustedSignerUpdated(_trustedSigner);
    }

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
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "SegmentNFT: no balance");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "SegmentNFT: withdrawal failed");
    }

    // ===========================================
    // View Functions
    // ===========================================

    /**
     * @dev Get current nonce for an address
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

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
     * @dev Get total number of minted segments
     */
    function totalSupply() external view returns (uint256) {
        return nextTokenId - 1;
    }

    /**
     * @dev Get multiple segments with pagination (newest first)
     * @param offset Number of segments to skip (0 = start from newest)
     * @param limit Maximum number of segments to return
     * @return tokenIds Array of token IDs
     * @return segmentList Array of Segment structs
     * @return total Total number of segments
     */
    function getSegments(
        uint256 offset,
        uint256 limit
    ) external view returns (
        uint256[] memory tokenIds,
        Segment[] memory segmentList,
        uint256 total
    ) {
        total = nextTokenId - 1;

        if (total == 0 || offset >= total) {
            return (new uint256[](0), new Segment[](0), total);
        }

        // Calculate actual count to return
        uint256 remaining = total - offset;
        uint256 count = remaining < limit ? remaining : limit;

        tokenIds = new uint256[](count);
        segmentList = new Segment[](count);

        // Return newest first (descending order by tokenId)
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = total - offset - i;
            tokenIds[i] = tokenId;
            segmentList[i] = segments[tokenId];
        }

        return (tokenIds, segmentList, total);
    }

    /**
     * @dev Get segments owned by a specific address
     * @param owner Address to query
     * @param offset Number of segments to skip
     * @param limit Maximum number of segments to return
     * @return tokenIds Array of token IDs owned by the address
     * @return segmentList Array of Segment structs
     * @return total Total number of segments owned by the address
     *
     * Note: This is O(n) where n is totalSupply. For large collections,
     * consider using off-chain indexing or events.
     */
    function getSegmentsByOwner(
        address owner,
        uint256 offset,
        uint256 limit
    ) external view returns (
        uint256[] memory tokenIds,
        Segment[] memory segmentList,
        uint256 total
    ) {
        uint256 supply = nextTokenId - 1;

        // First pass: count owned tokens
        uint256 ownedCount = 0;
        for (uint256 i = 1; i <= supply; i++) {
            if (_ownerOf(i) == owner) {
                ownedCount++;
            }
        }

        total = ownedCount;

        if (ownedCount == 0 || offset >= ownedCount) {
            return (new uint256[](0), new Segment[](0), total);
        }

        // Calculate actual count to return
        uint256 remaining = ownedCount - offset;
        uint256 count = remaining < limit ? remaining : limit;

        tokenIds = new uint256[](count);
        segmentList = new Segment[](count);

        // Second pass: collect owned tokens (newest first)
        uint256 found = 0;
        uint256 added = 0;
        for (uint256 i = supply; i >= 1 && added < count; i--) {
            if (_ownerOf(i) == owner) {
                if (found >= offset) {
                    tokenIds[added] = i;
                    segmentList[added] = segments[i];
                    added++;
                }
                found++;
            }
        }

        return (tokenIds, segmentList, total);
    }

    /**
     * @dev Returns token URI (on-chain metadata, immediately available)
     *
     * Since segments are independent artworks starting from empty board,
     * the metadata is fully determined at mint time.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SegmentNFT: token does not exist");

        Segment memory seg = segments[tokenId];

        string memory json = string(abi.encodePacked(
            '{"name":"Game of Life on BASE Segment #', tokenId.toString(),
            '","description":"An independent Game of Life artwork on BASE. ',
            'Starting from empty board, ', uint256(seg.nGenerations).toString(),
            ' generations of evolution.',
            '","attributes":[',
            '{"trait_type":"Generations","value":', uint256(seg.nGenerations).toString(), '},',
            '{"trait_type":"Farcaster FID","value":', seg.fid.toString(), '},',
            '{"trait_type":"Minted At Block","value":', seg.mintedAt.toString(), '}',
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
}
