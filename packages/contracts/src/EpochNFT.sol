// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ISegmentNFT
 * @dev Interface for SegmentNFT contract
 */
interface ISegmentNFT {
    struct Segment {
        address buyer;
        uint256 fid;
        uint256 startGen;
        uint256 nGenerations;
        bytes32 startStateRoot;
        string startStateCID;
        bytes cellsEncoded;
        bytes32 cellsHash;
        bool finalized;
        bytes32 endStateRoot;
        string endStateCID;
        string metadataURI;
    }

    function segments(uint256 tokenId) external view returns (
        address buyer,
        uint256 fid,
        uint256 startGen,
        uint256 nGenerations,
        bytes32 startStateRoot,
        string memory startStateCID,
        bytes memory cellsEncoded,
        bytes32 cellsHash,
        bool finalized,
        bytes32 endStateRoot,
        string memory endStateCID,
        string memory metadataURI
    );

    function nextTokenId() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title EpochNFT
 * @dev ERC-1155 NFT for Infinite Life epochs
 * Each epoch represents 256 generations of the Game of Life simulation
 * Open edition - multiple users can mint the same epoch
 */
contract EpochNFT is ERC1155, Ownable {
    using Strings for uint256;

    // ===========================================
    // Constants
    // ===========================================
    uint256 public constant GENERATIONS_PER_EPOCH = 256;

    // ===========================================
    // External References
    // ===========================================
    ISegmentNFT public segmentNFT;

    // ===========================================
    // Epoch Structure
    // ===========================================
    struct Epoch {
        uint256 startGen;        // 1, 257, 513...
        uint256 endGen;          // 256, 512, 768...
        string artifactURI;      // MP4 URI
        string metadataURI;      // JSON URI
        bool revealed;           // Is revealed
    }

    mapping(uint256 => Epoch) public epochs;

    // ===========================================
    // Pricing
    // ===========================================
    uint256 public mintPrice;

    // ===========================================
    // Contributor Tracking
    // ===========================================
    // epochId => user => claimed
    mapping(uint256 => mapping(address => bool)) public contributorClaimed;

    // ===========================================
    // Access Control
    // ===========================================
    address public finalizer;

    // ===========================================
    // Events
    // ===========================================
    event EpochRevealed(
        uint256 indexed epochId,
        uint256 startGen,
        uint256 endGen,
        string artifactURI,
        string metadataURI
    );

    event EpochMinted(
        uint256 indexed epochId,
        address indexed minter,
        bool isContributor
    );

    event MintPriceUpdated(uint256 newPrice);
    event FinalizerUpdated(address indexed newFinalizer);

    // ===========================================
    // Modifiers
    // ===========================================
    modifier onlyFinalizer() {
        require(msg.sender == finalizer, "EpochNFT: caller is not finalizer");
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================
    constructor(
        address _owner,
        address _finalizer,
        address _segmentNFT,
        uint256 _mintPrice
    ) ERC1155("") Ownable(_owner) {
        finalizer = _finalizer;
        segmentNFT = ISegmentNFT(_segmentNFT);
        mintPrice = _mintPrice;
    }

    // ===========================================
    // External Functions
    // ===========================================

    /**
     * @dev Mint epoch NFT (paid)
     * @param epochId The epoch ID to mint
     */
    function mint(uint256 epochId) external payable {
        require(epochs[epochId].revealed, "EpochNFT: epoch not revealed");
        require(msg.value >= mintPrice, "EpochNFT: insufficient payment");

        _mint(msg.sender, epochId, 1, "");

        emit EpochMinted(epochId, msg.sender, false);

        // Refund excess payment
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }
    }

    /**
     * @dev Mint epoch NFT as a contributor (free)
     * @param epochId The epoch ID to mint
     * @param segmentTokenId The segment token ID that proves contribution
     */
    function mintAsContributor(
        uint256 epochId,
        uint256 segmentTokenId
    ) external {
        require(epochs[epochId].revealed, "EpochNFT: epoch not revealed");
        require(
            !contributorClaimed[epochId][msg.sender],
            "EpochNFT: already claimed"
        );

        // Verify segment ownership
        address segmentOwner = segmentNFT.ownerOf(segmentTokenId);
        require(segmentOwner == msg.sender, "EpochNFT: not segment owner");

        // Get segment data
        (
            ,  // buyer
            ,  // fid
            uint256 startGen,
            uint256 nGenerations,
            ,  // startStateRoot
            ,  // startStateCID
            ,  // cellsEncoded
            ,  // cellsHash
            ,  // finalized
            ,  // endStateRoot
            ,  // endStateCID
               // metadataURI
        ) = segmentNFT.segments(segmentTokenId);

        // Calculate segment's generation range
        uint256 segEndGen = startGen + nGenerations - 1;

        // Verify segment contributes to this epoch
        Epoch memory epoch = epochs[epochId];
        require(
            startGen <= epoch.endGen && segEndGen >= epoch.startGen,
            "EpochNFT: segment not in epoch"
        );

        // Mark as claimed and mint
        contributorClaimed[epochId][msg.sender] = true;
        _mint(msg.sender, epochId, 1, "");

        emit EpochMinted(epochId, msg.sender, true);
    }

    /**
     * @dev Check if user is a contributor to an epoch
     * @param epochId The epoch ID
     * @param user The user address
     * @param segmentTokenIds Array of segment token IDs to check
     * @return isContributor Whether the user contributed to the epoch
     * @return eligibleSegmentId The first eligible segment ID (0 if none)
     */
    function checkContributorStatus(
        uint256 epochId,
        address user,
        uint256[] calldata segmentTokenIds
    ) external view returns (bool isContributor, uint256 eligibleSegmentId) {
        if (!epochs[epochId].revealed) {
            return (false, 0);
        }

        Epoch memory epoch = epochs[epochId];

        for (uint256 i = 0; i < segmentTokenIds.length; i++) {
            uint256 tokenId = segmentTokenIds[i];

            // Check ownership
            try segmentNFT.ownerOf(tokenId) returns (address owner) {
                if (owner != user) continue;
            } catch {
                continue;
            }

            // Get segment data
            (
                ,  // buyer
                ,  // fid
                uint256 startGen,
                uint256 nGenerations,
                ,  // startStateRoot
                ,  // startStateCID
                ,  // cellsEncoded
                ,  // cellsHash
                ,  // finalized
                ,  // endStateRoot
                ,  // endStateCID
                   // metadataURI
            ) = segmentNFT.segments(tokenId);

            uint256 segEndGen = startGen + nGenerations - 1;

            // Check overlap with epoch
            if (startGen <= epoch.endGen && segEndGen >= epoch.startGen) {
                return (true, tokenId);
            }
        }

        return (false, 0);
    }

    // ===========================================
    // Finalizer Functions
    // ===========================================

    /**
     * @dev Reveal an epoch (finalizer only)
     * @param epochId The epoch ID (1, 2, 3...)
     * @param artifactURI URI to the MP4 video
     * @param metadataURI URI to the metadata JSON
     */
    function revealEpoch(
        uint256 epochId,
        string calldata artifactURI,
        string calldata metadataURI
    ) external onlyFinalizer {
        require(epochId > 0, "EpochNFT: invalid epoch ID");
        require(!epochs[epochId].revealed, "EpochNFT: already revealed");

        uint256 startGen = (epochId - 1) * GENERATIONS_PER_EPOCH + 1;
        uint256 endGen = epochId * GENERATIONS_PER_EPOCH;

        epochs[epochId] = Epoch({
            startGen: startGen,
            endGen: endGen,
            artifactURI: artifactURI,
            metadataURI: metadataURI,
            revealed: true
        });

        emit EpochRevealed(epochId, startGen, endGen, artifactURI, metadataURI);
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    /**
     * @dev Update mint price (owner only)
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    /**
     * @dev Update finalizer address (owner only)
     */
    function setFinalizer(address _finalizer) external onlyOwner {
        require(_finalizer != address(0), "EpochNFT: invalid finalizer");
        finalizer = _finalizer;
        emit FinalizerUpdated(_finalizer);
    }

    /**
     * @dev Update SegmentNFT reference (owner only)
     */
    function setSegmentNFT(address _segmentNFT) external onlyOwner {
        require(_segmentNFT != address(0), "EpochNFT: invalid address");
        segmentNFT = ISegmentNFT(_segmentNFT);
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "EpochNFT: no balance");
        payable(owner()).transfer(balance);
    }

    // ===========================================
    // View Functions
    // ===========================================

    /**
     * @dev Get epoch data
     */
    function getEpoch(uint256 epochId) external view returns (Epoch memory) {
        return epochs[epochId];
    }

    /**
     * @dev Calculate epoch ID from generation number
     */
    function getEpochIdFromGeneration(uint256 generation) external pure returns (uint256) {
        if (generation == 0) return 0;
        return (generation - 1) / GENERATIONS_PER_EPOCH + 1;
    }

    /**
     * @dev Returns metadata URI for a token
     */
    function uri(uint256 epochId) public view override returns (string memory) {
        require(epochs[epochId].revealed, "EpochNFT: epoch not revealed");
        return epochs[epochId].metadataURI;
    }
}
