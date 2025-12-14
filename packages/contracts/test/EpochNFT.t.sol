// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SegmentNFT.sol";
import "../src/EpochNFT.sol";

contract EpochNFTTest is Test {
    SegmentNFT public segmentNFT;
    EpochNFT public epochNFT;

    address public owner = address(0x1001);
    address public finalizer = address(0x1002);
    address public user1 = address(0x1003);
    address public user2 = address(0x1004);

    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors");
    bytes32 public constant INITIAL_STATE_ROOT = keccak256("initial state");
    string public constant INITIAL_STATE_CID = "QmInitialState";

    uint256 public constant EPOCH_MINT_PRICE = 0.0001 ether;

    function setUp() public {
        // Deploy SegmentNFT
        segmentNFT = new SegmentNFT(
            owner,
            finalizer,
            RULESET_HASH,
            INITIAL_STATE_ROOT,
            INITIAL_STATE_CID,
            0.00005 ether, // baseFee
            0.000005 ether, // perGenFee
            0 // perCellFee
        );

        // Deploy EpochNFT
        epochNFT = new EpochNFT(
            owner,
            finalizer,
            address(segmentNFT),
            EPOCH_MINT_PRICE
        );

        // Fund test users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // ===========================================
    // Constructor Tests
    // ===========================================

    function test_Constructor() public view {
        assertEq(epochNFT.owner(), owner);
        assertEq(epochNFT.finalizer(), finalizer);
        assertEq(address(epochNFT.segmentNFT()), address(segmentNFT));
        assertEq(epochNFT.mintPrice(), EPOCH_MINT_PRICE);
    }

    // ===========================================
    // Reveal Epoch Tests
    // ===========================================

    function test_RevealEpoch() public {
        string memory artifactURI = "ipfs://QmArtifact";
        string memory metadataURI = "ipfs://QmMetadata";

        vm.prank(finalizer);
        epochNFT.revealEpoch(1, artifactURI, metadataURI);

        EpochNFT.Epoch memory epoch = epochNFT.getEpoch(1);
        assertEq(epoch.startGen, 1);
        assertEq(epoch.endGen, 256);
        assertEq(epoch.artifactURI, artifactURI);
        assertEq(epoch.metadataURI, metadataURI);
        assertTrue(epoch.revealed);
    }

    function test_RevealEpoch_SecondEpoch() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(2, "ipfs://QmArtifact2", "ipfs://QmMetadata2");

        EpochNFT.Epoch memory epoch = epochNFT.getEpoch(2);
        assertEq(epoch.startGen, 257);
        assertEq(epoch.endGen, 512);
    }

    function test_RevertWhen_RevealEpoch_NotFinalizer() public {
        vm.prank(user1);
        vm.expectRevert("EpochNFT: caller is not finalizer");
        epochNFT.revealEpoch(1, "uri", "uri");
    }

    function test_RevertWhen_RevealEpoch_ZeroId() public {
        vm.prank(finalizer);
        vm.expectRevert("EpochNFT: invalid epoch ID");
        epochNFT.revealEpoch(0, "uri", "uri");
    }

    function test_RevertWhen_RevealEpoch_AlreadyRevealed() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        vm.prank(finalizer);
        vm.expectRevert("EpochNFT: already revealed");
        epochNFT.revealEpoch(1, "uri2", "uri2");
    }

    // ===========================================
    // Paid Mint Tests
    // ===========================================

    function test_Mint_Paid() public {
        // Reveal epoch first
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "ipfs://QmArtifact", "ipfs://QmMetadata");

        // Mint
        vm.prank(user1);
        epochNFT.mint{value: EPOCH_MINT_PRICE}(1);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
    }

    function test_Mint_Paid_RefundsExcess() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        epochNFT.mint{value: EPOCH_MINT_PRICE + 0.01 ether}(1);

        assertEq(user1.balance, balanceBefore - EPOCH_MINT_PRICE);
    }

    function test_Mint_Paid_MultipleUsers() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        vm.prank(user1);
        epochNFT.mint{value: EPOCH_MINT_PRICE}(1);

        vm.prank(user2);
        epochNFT.mint{value: EPOCH_MINT_PRICE}(1);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
        assertEq(epochNFT.balanceOf(user2, 1), 1);
    }

    function test_RevertWhen_Mint_NotRevealed() public {
        vm.prank(user1);
        vm.expectRevert("EpochNFT: epoch not revealed");
        epochNFT.mint{value: EPOCH_MINT_PRICE}(1);
    }

    function test_RevertWhen_Mint_InsufficientPayment() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        vm.prank(user1);
        vm.expectRevert("EpochNFT: insufficient payment");
        epochNFT.mint{value: EPOCH_MINT_PRICE - 1}(1);
    }

    // ===========================================
    // Contributor Mint Tests
    // ===========================================

    function test_MintAsContributor() public {
        // User1 buys a segment that spans epoch 1 (gen 1-256)
        vm.prank(user1);
        uint256 segmentId = segmentNFT.buySegment{value: 0.001 ether}(
            10, // 10 generations (gen 1-10)
            new bytes(0),
            12345
        );

        // Finalize the segment
        vm.prank(finalizer);
        segmentNFT.finalizeSegment(segmentId, keccak256("end"), "endCID", "metaURI");

        // Reveal epoch 1
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "ipfs://QmArtifact", "ipfs://QmMetadata");

        // User1 mints as contributor (free)
        vm.prank(user1);
        epochNFT.mintAsContributor(1, segmentId);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
        assertTrue(epochNFT.contributorClaimed(1, user1));
    }

    function test_RevertWhen_MintAsContributor_NotOwner() public {
        // User1 buys a segment
        vm.prank(user1);
        uint256 segmentId = segmentNFT.buySegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(segmentId, keccak256("end"), "endCID", "metaURI");

        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        // User2 tries to claim with user1's segment
        vm.prank(user2);
        vm.expectRevert("EpochNFT: not segment owner");
        epochNFT.mintAsContributor(1, segmentId);
    }

    function test_RevertWhen_MintAsContributor_AlreadyClaimed() public {
        vm.prank(user1);
        uint256 segmentId = segmentNFT.buySegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(segmentId, keccak256("end"), "endCID", "metaURI");

        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        // First claim
        vm.prank(user1);
        epochNFT.mintAsContributor(1, segmentId);

        // Try to claim again
        vm.prank(user1);
        vm.expectRevert("EpochNFT: already claimed");
        epochNFT.mintAsContributor(1, segmentId);
    }

    // ===========================================
    // Check Contributor Status Tests
    // ===========================================

    function test_CheckContributorStatus() public {
        vm.prank(user1);
        uint256 segmentId = segmentNFT.buySegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(segmentId, keccak256("end"), "endCID", "metaURI");

        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        uint256[] memory segmentIds = new uint256[](1);
        segmentIds[0] = segmentId;

        (bool isContributor, uint256 eligibleId) = epochNFT.checkContributorStatus(1, user1, segmentIds);

        assertTrue(isContributor);
        assertEq(eligibleId, segmentId);
    }

    function test_CheckContributorStatus_NotContributor() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        uint256[] memory segmentIds = new uint256[](0);

        (bool isContributor, uint256 eligibleId) = epochNFT.checkContributorStatus(1, user1, segmentIds);

        assertFalse(isContributor);
        assertEq(eligibleId, 0);
    }

    // ===========================================
    // URI Tests
    // ===========================================

    function test_URI() public {
        string memory metadataURI = "ipfs://QmMetadata123";

        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "ipfs://QmArtifact", metadataURI);

        assertEq(epochNFT.uri(1), metadataURI);
    }

    function test_RevertWhen_URI_NotRevealed() public {
        vm.expectRevert("EpochNFT: epoch not revealed");
        epochNFT.uri(1);
    }

    // ===========================================
    // Admin Tests
    // ===========================================

    function test_SetMintPrice() public {
        uint256 newPrice = 0.0002 ether;

        vm.prank(owner);
        epochNFT.setMintPrice(newPrice);

        assertEq(epochNFT.mintPrice(), newPrice);
    }

    function test_SetFinalizer() public {
        address newFinalizer = address(100);

        vm.prank(owner);
        epochNFT.setFinalizer(newFinalizer);

        assertEq(epochNFT.finalizer(), newFinalizer);
    }

    function test_Withdraw() public {
        vm.prank(finalizer);
        epochNFT.revealEpoch(1, "uri", "uri");

        vm.prank(user1);
        epochNFT.mint{value: EPOCH_MINT_PRICE}(1);

        uint256 contractBalance = address(epochNFT).balance;
        assertTrue(contractBalance > 0, "Contract should have balance");

        // Fund owner so they can receive
        vm.deal(owner, 1 ether);
        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        epochNFT.withdraw();

        assertEq(address(epochNFT).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    // ===========================================
    // Helper Functions
    // ===========================================

    function test_GetEpochIdFromGeneration() public view {
        assertEq(epochNFT.getEpochIdFromGeneration(0), 0);
        assertEq(epochNFT.getEpochIdFromGeneration(1), 1);
        assertEq(epochNFT.getEpochIdFromGeneration(256), 1);
        assertEq(epochNFT.getEpochIdFromGeneration(257), 2);
        assertEq(epochNFT.getEpochIdFromGeneration(512), 2);
        assertEq(epochNFT.getEpochIdFromGeneration(513), 3);
    }
}
