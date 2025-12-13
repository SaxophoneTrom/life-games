// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SegmentNFT.sol";
import "../src/EpochArchiveNFT.sol";

contract EpochArchiveNFTTest is Test {
    SegmentNFT public segmentNFT;
    EpochArchiveNFT public epochNFT;

    address public owner = address(0x1001);
    address public epochMinter = address(0x1002);
    address public trustedSigner = address(0x1005);
    address public user1 = address(0x1003);
    address public user2 = address(0x1004);

    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors");

    uint256 public constant EPOCH_MINT_PRICE = 0.0001 ether;

    function setUp() public {
        // Deploy SegmentNFT
        segmentNFT = new SegmentNFT(
            owner,
            trustedSigner,
            RULESET_HASH,
            0.00005 ether, // baseFee
            0.000005 ether, // perGenFee
            0 // perCellFee
        );

        // Deploy EpochArchiveNFT
        epochNFT = new EpochArchiveNFT(
            owner,
            epochMinter,
            address(segmentNFT),
            EPOCH_MINT_PRICE
        );

        // Fund test users and owner
        vm.deal(owner, 10 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // Helper to mint segment as owner and transfer to user
    function _mintSegmentForUser(address user, uint256 blockNum) internal returns (uint256) {
        vm.roll(blockNum);
        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);
        // Transfer to user
        vm.prank(owner);
        segmentNFT.transferFrom(owner, user, tokenId);
        return tokenId;
    }

    // ===========================================
    // Helper Functions
    // ===========================================

    function _createMintEpochParams(
        uint256 epochId,
        uint256 startBlock,
        uint256 endBlock
    ) internal pure returns (EpochArchiveNFT.MintEpochParams memory) {
        return EpochArchiveNFT.MintEpochParams({
            epochId: epochId,
            startStateRoot: keccak256(abi.encodePacked("start", epochId)),
            startStateCID: "QmStartState",
            endStateRoot: keccak256(abi.encodePacked("end", epochId)),
            endStateCID: "QmEndState",
            artifactURI: "ipfs://QmArtifact",
            metadataURI: "ipfs://QmMetadata",
            contributorsCID: "QmContributors",
            contributorsRoot: keccak256(abi.encodePacked("contributors", epochId)),
            startBlock: startBlock,
            endBlock: endBlock
        });
    }

    // ===========================================
    // Constructor Tests
    // ===========================================

    function test_Constructor() public view {
        assertEq(epochNFT.owner(), owner);
        assertEq(epochNFT.epochMinter(), epochMinter);
        assertEq(address(epochNFT.segmentNFT()), address(segmentNFT));
        assertEq(epochNFT.mintPrice(), EPOCH_MINT_PRICE);
        assertEq(epochNFT.lastMintedEpochId(), 0);
    }

    // ===========================================
    // Mint Epoch Tests
    // ===========================================

    function test_MintEpoch() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(EpochArchiveNFT.MintEpochParams({
            epochId: 1,
            startStateRoot: keccak256("start"),
            startStateCID: "QmStartState",
            endStateRoot: keccak256("end"),
            endStateCID: "QmEndState",
            artifactURI: "ipfs://QmArtifact",
            metadataURI: "ipfs://QmMetadata",
            contributorsCID: "QmContributors",
            contributorsRoot: keccak256("contributors"),
            startBlock: 100,
            endBlock: 200
        }));

        EpochArchiveNFT.Epoch memory epoch = epochNFT.getEpoch(1);
        assertEq(epoch.absStartGen, 1);
        assertEq(epoch.absEndGen, 256);
        assertEq(epoch.startStateRoot, keccak256("start"));
        assertEq(epoch.endStateRoot, keccak256("end"));
        assertEq(epoch.artifactURI, "ipfs://QmArtifact");
        assertEq(epoch.metadataURI, "ipfs://QmMetadata");
        assertEq(epoch.contributorsCID, "QmContributors");
        assertEq(epoch.startBlock, 100);
        assertEq(epoch.endBlock, 200);
        assertTrue(epoch.revealed);

        assertEq(epochNFT.lastMintedEpochId(), 1);
    }

    function test_MintEpoch_Sequential() public {
        // Mint epoch 1
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));
        assertEq(epochNFT.lastMintedEpochId(), 1);

        // Mint epoch 2
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(2, 201, 300));
        assertEq(epochNFT.lastMintedEpochId(), 2);

        // Verify epoch 2 data
        EpochArchiveNFT.Epoch memory epoch2 = epochNFT.getEpoch(2);
        assertEq(epoch2.absStartGen, 257);
        assertEq(epoch2.absEndGen, 512);
    }

    function test_RevertWhen_MintEpoch_NotSequential() public {
        // Try to mint epoch 2 first (should fail)
        vm.prank(epochMinter);
        vm.expectRevert("EpochArchiveNFT: must mint sequentially");
        epochNFT.mintEpoch(_createMintEpochParams(2, 100, 200));
    }

    function test_RevertWhen_MintEpoch_SkipEpoch() public {
        // Mint epoch 1
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // Try to skip to epoch 3 (should fail)
        vm.prank(epochMinter);
        vm.expectRevert("EpochArchiveNFT: must mint sequentially");
        epochNFT.mintEpoch(_createMintEpochParams(3, 201, 300));
    }

    function test_RevertWhen_MintEpoch_NotEpochMinter() public {
        vm.prank(user1);
        vm.expectRevert("EpochArchiveNFT: caller is not epoch minter");
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));
    }

    function test_RevertWhen_MintEpoch_ZeroId() public {
        vm.prank(epochMinter);
        vm.expectRevert("EpochArchiveNFT: invalid epoch ID");
        epochNFT.mintEpoch(_createMintEpochParams(0, 100, 200));
    }

    function test_RevertWhen_MintEpoch_InvalidBlockRange() public {
        vm.prank(epochMinter);
        vm.expectRevert("EpochArchiveNFT: invalid block range");
        epochNFT.mintEpoch(_createMintEpochParams(1, 200, 100));
    }

    // ===========================================
    // Paid Collect Tests
    // ===========================================

    function test_Collect_Paid() public {
        // Mint epoch first
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // Collect
        vm.prank(user1);
        epochNFT.collect{value: EPOCH_MINT_PRICE}(1);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
    }

    function test_Collect_Paid_RefundsExcess() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        epochNFT.collect{value: EPOCH_MINT_PRICE + 0.01 ether}(1);

        assertEq(user1.balance, balanceBefore - EPOCH_MINT_PRICE);
    }

    function test_Collect_Paid_MultipleUsers() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        vm.prank(user1);
        epochNFT.collect{value: EPOCH_MINT_PRICE}(1);

        vm.prank(user2);
        epochNFT.collect{value: EPOCH_MINT_PRICE}(1);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
        assertEq(epochNFT.balanceOf(user2, 1), 1);
    }

    function test_RevertWhen_Collect_NotRevealed() public {
        vm.prank(user1);
        vm.expectRevert("EpochArchiveNFT: epoch not revealed");
        epochNFT.collect{value: EPOCH_MINT_PRICE}(1);
    }

    function test_RevertWhen_Collect_InsufficientPayment() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        vm.prank(user1);
        vm.expectRevert("EpochArchiveNFT: insufficient payment");
        epochNFT.collect{value: EPOCH_MINT_PRICE - 1}(1);
    }

    // ===========================================
    // Contributor Collect Tests
    // ===========================================

    function test_CollectAsContributor() public {
        // User1 mints a segment at block 150
        vm.roll(150);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(
            10,
            new bytes(0),
            12345
        );

        // Verify segment mintedAt
        assertEq(segmentNFT.getSegment(segmentId).mintedAt, 150);

        // Mint epoch 1 with block range 100-200
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // User1 collects as contributor (free)
        vm.prank(user1);
        epochNFT.collectAsContributor(1, segmentId);

        assertEq(epochNFT.balanceOf(user1, 1), 1);
        assertTrue(epochNFT.contributorClaimed(1, user1));
    }

    function test_CollectAsContributor_AfterTransfer() public {
        // User1 mints a segment at block 150
        vm.roll(150);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        // User1 transfers segment to user2
        vm.prank(user1);
        segmentNFT.transferFrom(user1, user2, segmentId);

        // Mint epoch 1
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // User2 (new owner) can collect as contributor
        vm.prank(user2);
        epochNFT.collectAsContributor(1, segmentId);

        assertEq(epochNFT.balanceOf(user2, 1), 1);
    }

    function test_RevertWhen_CollectAsContributor_NotOwner() public {
        // User1 mints a segment
        vm.roll(150);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // User2 tries to claim with user1's segment
        vm.prank(user2);
        vm.expectRevert("EpochArchiveNFT: not segment owner");
        epochNFT.collectAsContributor(1, segmentId);
    }

    function test_RevertWhen_CollectAsContributor_AlreadyClaimed() public {
        vm.roll(150);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // First claim
        vm.prank(user1);
        epochNFT.collectAsContributor(1, segmentId);

        // Try to claim again
        vm.prank(user1);
        vm.expectRevert("EpochArchiveNFT: already claimed");
        epochNFT.collectAsContributor(1, segmentId);
    }

    function test_RevertWhen_CollectAsContributor_SegmentNotInEpoch() public {
        // User1 mints a segment at block 250 (outside epoch 1 range 100-200)
        vm.roll(250);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // Try to claim with segment that's not in epoch's block range
        vm.prank(user1);
        vm.expectRevert("EpochArchiveNFT: segment not in epoch");
        epochNFT.collectAsContributor(1, segmentId);
    }

    // ===========================================
    // Check Contributor Status Tests
    // ===========================================

    function test_CheckContributorStatus() public {
        vm.roll(150);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        uint256[] memory segmentIds = new uint256[](1);
        segmentIds[0] = segmentId;

        (bool isContributor, uint256 eligibleId) = epochNFT.checkContributorStatus(1, user1, segmentIds);

        assertTrue(isContributor);
        assertEq(eligibleId, segmentId);
    }

    function test_CheckContributorStatus_NotContributor() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        uint256[] memory segmentIds = new uint256[](0);

        (bool isContributor, uint256 eligibleId) = epochNFT.checkContributorStatus(1, user1, segmentIds);

        assertFalse(isContributor);
        assertEq(eligibleId, 0);
    }

    function test_CheckContributorStatus_SegmentOutsideRange() public {
        // Segment at block 250
        vm.roll(250);
        vm.prank(user1);
        uint256 segmentId = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        // Epoch with block range 100-200
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        uint256[] memory segmentIds = new uint256[](1);
        segmentIds[0] = segmentId;

        (bool isContributor, uint256 eligibleId) = epochNFT.checkContributorStatus(1, user1, segmentIds);

        assertFalse(isContributor);
        assertEq(eligibleId, 0);
    }

    // ===========================================
    // URI Tests
    // ===========================================

    function test_URI() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(EpochArchiveNFT.MintEpochParams({
            epochId: 1,
            startStateRoot: keccak256("start"),
            startStateCID: "QmStartState",
            endStateRoot: keccak256("end"),
            endStateCID: "QmEndState",
            artifactURI: "ipfs://QmArtifact",
            metadataURI: "ipfs://QmMetadata123",
            contributorsCID: "QmContributors",
            contributorsRoot: keccak256("contributors"),
            startBlock: 100,
            endBlock: 200
        }));

        assertEq(epochNFT.uri(1), "ipfs://QmMetadata123");
    }

    function test_RevertWhen_URI_NotRevealed() public {
        vm.expectRevert("EpochArchiveNFT: epoch not revealed");
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

    function test_SetEpochMinter() public {
        address newMinter = address(100);

        vm.prank(owner);
        epochNFT.setEpochMinter(newMinter);

        assertEq(epochNFT.epochMinter(), newMinter);
    }

    function test_RevertWhen_SetEpochMinter_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("EpochArchiveNFT: invalid minter");
        epochNFT.setEpochMinter(address(0));
    }

    function test_SetSegmentNFT() public {
        address newSegmentNFT = address(100);

        vm.prank(owner);
        epochNFT.setSegmentNFT(newSegmentNFT);

        assertEq(address(epochNFT.segmentNFT()), newSegmentNFT);
    }

    function test_Withdraw() public {
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        vm.prank(user1);
        epochNFT.collect{value: EPOCH_MINT_PRICE}(1);

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

    function test_RevertWhen_Withdraw_NoBalance() public {
        vm.prank(owner);
        vm.expectRevert("EpochArchiveNFT: no balance");
        epochNFT.withdraw();
    }

    // ===========================================
    // Helper Functions Tests
    // ===========================================

    function test_GetEpochIdFromGeneration() public view {
        assertEq(epochNFT.getEpochIdFromGeneration(0), 0);
        assertEq(epochNFT.getEpochIdFromGeneration(1), 1);
        assertEq(epochNFT.getEpochIdFromGeneration(256), 1);
        assertEq(epochNFT.getEpochIdFromGeneration(257), 2);
        assertEq(epochNFT.getEpochIdFromGeneration(512), 2);
        assertEq(epochNFT.getEpochIdFromGeneration(513), 3);
    }

    // ===========================================
    // Edge Cases
    // ===========================================

    function test_CollectAsContributor_BoundaryBlock() public {
        // Segment at exactly startBlock
        vm.roll(100);
        vm.prank(user1);
        uint256 segmentId1 = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        // Segment at exactly endBlock
        vm.roll(200);
        vm.prank(user2);
        uint256 segmentId2 = segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 22222);

        // Mint epoch with block range 100-200
        vm.prank(epochMinter);
        epochNFT.mintEpoch(_createMintEpochParams(1, 100, 200));

        // Both should be able to collect
        vm.prank(user1);
        epochNFT.collectAsContributor(1, segmentId1);
        assertEq(epochNFT.balanceOf(user1, 1), 1);

        vm.prank(user2);
        epochNFT.collectAsContributor(1, segmentId2);
        assertEq(epochNFT.balanceOf(user2, 1), 1);
    }
}
