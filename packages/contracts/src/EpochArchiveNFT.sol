// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ISegmentNFT
 * @dev Interface for SegmentNFT contract (New Architecture)
 */
interface ISegmentNFT {
    struct Segment {
        address minter;
        uint256 fid;
        uint8 nGenerations;
        bytes32 cellsHash;
        uint256 mintedAt;
    }

    function segments(uint256 tokenId) external view returns (
        address minter,
        uint256 fid,
        uint8 nGenerations,
        bytes32 cellsHash,
        uint256 mintedAt
    );

    function nextTokenId() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title EpochArchiveNFT
 * @dev ERC-1155 NFT for Infinite Life epochs (Shared Timeline Archive)
 *
 * New Architecture (2025-12-15):
 * - Each epoch represents 256 generations of the SHARED timeline
 * - Shared timeline is constructed by applying Segment contributions in block order
 * - Contributors (Segment minters whose segments contribute to an epoch) can mint for free
 * - Contains checkpoint data for verification and future revenue sharing
 * - Epochs must be minted sequentially (1, 2, 3, ...) to ensure timeline integrity
 */
contract EpochArchiveNFT is ERC1155, Ownable, ReentrancyGuard {
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
    // Epoch Structure (Extended for Shared Timeline)
    // ===========================================
    struct Epoch {
        uint256 absStartGen;      // Absolute start generation (1, 257, 513...)
        uint256 absEndGen;        // Absolute end generation (256, 512, 768...)
        bytes32 startStateRoot;   // State root at epoch start
        string startStateCID;     // IPFS CID of start state
        bytes32 endStateRoot;     // State root at epoch end
        string endStateCID;       // IPFS CID of end state
        string artifactURI;       // MP4 video URI
        string metadataURI;       // JSON metadata URI
        string contributorsCID;   // IPFS CID of contributors list JSON
        bytes32 contributorsRoot; // Merkle root of contributors (for future verification/revenue sharing)
        uint256 startBlock;       // First block number included in this epoch
        uint256 endBlock;         // Last block number included in this epoch
        bool revealed;            // Is epoch revealed/minted
    }

    /**
     * @dev Parameters for minting an epoch (used to avoid stack too deep)
     */
    struct MintEpochParams {
        uint256 epochId;
        bytes32 startStateRoot;
        string startStateCID;
        bytes32 endStateRoot;
        string endStateCID;
        string artifactURI;
        string metadataURI;
        string contributorsCID;
        bytes32 contributorsRoot;
        uint256 startBlock;
        uint256 endBlock;
    }

    mapping(uint256 => Epoch) public epochs;

    // ===========================================
    // Sequential Epoch Tracking
    // ===========================================
    uint256 public lastMintedEpochId; // Last minted epoch ID (ensures sequential minting)

    // ===========================================
    // Pricing
    // ===========================================
    uint256 public mintPrice;

    // ===========================================
    // Contributor Tracking
    // ===========================================
    // epochId => user => claimed (for free mint)
    mapping(uint256 => mapping(address => bool)) public contributorClaimed;

    // ===========================================
    // Access Control
    // ===========================================
    address public epochMinter; // Address authorized to mint epochs (GitHub Actions bot)

    // ===========================================
    // Events
    // ===========================================
    event EpochMinted(
        uint256 indexed epochId,
        uint256 absStartGen,
        uint256 absEndGen,
        uint256 startBlock,
        uint256 endBlock,
        string artifactURI,
        string contributorsCID
    );

    event EpochCollected(
        uint256 indexed epochId,
        address indexed collector,
        bool isContributor
    );

    event MintPriceUpdated(uint256 newPrice);
    event EpochMinterUpdated(address indexed newMinter);

    // ===========================================
    // Modifiers
    // ===========================================
    modifier onlyEpochMinter() {
        require(msg.sender == epochMinter, "EpochArchiveNFT: caller is not epoch minter");
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================
    constructor(
        address _owner,
        address _epochMinter,
        address _segmentNFT,
        uint256 _mintPrice
    ) ERC1155("") Ownable(_owner) {
        epochMinter = _epochMinter;
        segmentNFT = ISegmentNFT(_segmentNFT);
        mintPrice = _mintPrice;
        lastMintedEpochId = 0; // No epochs minted yet
    }

    // ===========================================
    // External Functions
    // ===========================================

    /**
     * @dev Collect epoch NFT (paid)
     * @param epochId The epoch ID to collect
     */
    function collect(uint256 epochId) external payable nonReentrant {
        require(epochs[epochId].revealed, "EpochArchiveNFT: epoch not revealed");
        require(msg.value >= mintPrice, "EpochArchiveNFT: insufficient payment");

        _mint(msg.sender, epochId, 1, "");

        emit EpochCollected(epochId, msg.sender, false);

        // Refund excess payment using call
        if (msg.value > mintPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - mintPrice}("");
            require(success, "EpochArchiveNFT: refund failed");
        }
    }

    /**
     * @dev Collect epoch NFT as a contributor (free)
     * @param epochId The epoch ID to collect
     * @param segmentTokenId The segment token ID that proves contribution
     *
     * Contribution is determined by the segment's mintedAt block being within
     * the epoch's block range (startBlock to endBlock).
     * Note: Current owner (not original minter) can claim - allows secondary market holders to benefit.
     */
    function collectAsContributor(
        uint256 epochId,
        uint256 segmentTokenId
    ) external nonReentrant {
        require(epochs[epochId].revealed, "EpochArchiveNFT: epoch not revealed");
        require(
            !contributorClaimed[epochId][msg.sender],
            "EpochArchiveNFT: already claimed"
        );

        // Verify segment ownership (current owner, not original minter)
        address segmentOwner = segmentNFT.ownerOf(segmentTokenId);
        require(segmentOwner == msg.sender, "EpochArchiveNFT: not segment owner");

        // Get segment data
        (
            ,  // minter
            ,  // fid
            ,  // nGenerations
            ,  // cellsHash
            uint256 mintedAt
        ) = segmentNFT.segments(segmentTokenId);

        // Verify segment contributes to this epoch (by block range)
        Epoch storage epoch = epochs[epochId];
        require(
            mintedAt >= epoch.startBlock && mintedAt <= epoch.endBlock,
            "EpochArchiveNFT: segment not in epoch"
        );

        // Mark as claimed and mint
        contributorClaimed[epochId][msg.sender] = true;
        _mint(msg.sender, epochId, 1, "");

        emit EpochCollected(epochId, msg.sender, true);
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

        Epoch storage epoch = epochs[epochId];

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
                ,  // minter
                ,  // fid
                ,  // nGenerations
                ,  // cellsHash
                uint256 mintedAt
            ) = segmentNFT.segments(tokenId);

            // Check if segment's mintedAt is within epoch's block range
            if (mintedAt >= epoch.startBlock && mintedAt <= epoch.endBlock) {
                return (true, tokenId);
            }
        }

        return (false, 0);
    }

    // ===========================================
    // Epoch Minter Functions
    // ===========================================

    /**
     * @dev Mint a new epoch (epoch minter only, called by GitHub Actions)
     * @param params MintEpochParams struct containing all epoch data
     *
     * Note: Epochs must be minted sequentially to ensure shared timeline integrity.
     */
    function mintEpoch(MintEpochParams calldata params) external onlyEpochMinter {
        require(params.epochId > 0, "EpochArchiveNFT: invalid epoch ID");
        require(params.epochId == lastMintedEpochId + 1, "EpochArchiveNFT: must mint sequentially");
        require(!epochs[params.epochId].revealed, "EpochArchiveNFT: already minted");
        require(params.startBlock <= params.endBlock, "EpochArchiveNFT: invalid block range");

        uint256 absStartGen = (params.epochId - 1) * GENERATIONS_PER_EPOCH + 1;
        uint256 absEndGen = params.epochId * GENERATIONS_PER_EPOCH;

        epochs[params.epochId] = Epoch({
            absStartGen: absStartGen,
            absEndGen: absEndGen,
            startStateRoot: params.startStateRoot,
            startStateCID: params.startStateCID,
            endStateRoot: params.endStateRoot,
            endStateCID: params.endStateCID,
            artifactURI: params.artifactURI,
            metadataURI: params.metadataURI,
            contributorsCID: params.contributorsCID,
            contributorsRoot: params.contributorsRoot,
            startBlock: params.startBlock,
            endBlock: params.endBlock,
            revealed: true
        });

        // Update last minted epoch ID
        lastMintedEpochId = params.epochId;

        emit EpochMinted(
            params.epochId,
            absStartGen,
            absEndGen,
            params.startBlock,
            params.endBlock,
            params.artifactURI,
            params.contributorsCID
        );
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
     * @dev Update epoch minter address (owner only)
     */
    function setEpochMinter(address _epochMinter) external onlyOwner {
        require(_epochMinter != address(0), "EpochArchiveNFT: invalid minter");
        epochMinter = _epochMinter;
        emit EpochMinterUpdated(_epochMinter);
    }

    /**
     * @dev Update SegmentNFT reference (owner only)
     */
    function setSegmentNFT(address _segmentNFT) external onlyOwner {
        require(_segmentNFT != address(0), "EpochArchiveNFT: invalid address");
        segmentNFT = ISegmentNFT(_segmentNFT);
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "EpochArchiveNFT: no balance");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "EpochArchiveNFT: withdrawal failed");
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
        require(epochs[epochId].revealed, "EpochArchiveNFT: epoch not revealed");
        return epochs[epochId].metadataURI;
    }
}
