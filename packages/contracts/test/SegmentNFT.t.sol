// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SegmentNFT.sol";

contract SegmentNFTTest is Test {
    SegmentNFT public segmentNFT;

    address public owner = address(0x1001);
    address public trustedSigner;
    uint256 public trustedSignerKey = 0xA11CE; // Private key for signing
    address public user1 = address(0x1003);
    address public user2 = address(0x1004);

    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors");

    uint256 public constant BASE_FEE = 0.00005 ether;
    uint256 public constant PER_GEN_FEE = 0.000005 ether;
    uint256 public constant PER_CELL_FEE = 0; // Free cell placement

    function setUp() public {
        trustedSigner = vm.addr(trustedSignerKey);

        segmentNFT = new SegmentNFT(
            owner,
            trustedSigner,
            RULESET_HASH,
            BASE_FEE,
            PER_GEN_FEE,
            PER_CELL_FEE
        );

        // Fund test users
        vm.deal(owner, 10 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // Helper to create signature
    function _createSignature(
        address user,
        uint8 nGenerations,
        bytes memory cellsEncoded,
        uint256 fid,
        uint256 nonce
    ) internal view returns (bytes memory) {
        bytes32 cellsHash = keccak256(cellsEncoded);
        bytes32 messageHash = keccak256(abi.encodePacked(
            user,
            nGenerations,
            cellsHash,
            fid,
            nonce,
            block.chainid,
            address(segmentNFT)
        ));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(trustedSignerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // ===========================================
    // Constructor Tests
    // ===========================================

    function test_Constructor() public view {
        assertEq(segmentNFT.owner(), owner);
        assertEq(segmentNFT.trustedSigner(), trustedSigner);
        assertEq(segmentNFT.rulesetHash(), RULESET_HASH);
        assertEq(segmentNFT.nextTokenId(), 1);
        assertEq(segmentNFT.baseFee(), BASE_FEE);
        assertEq(segmentNFT.perGenFee(), PER_GEN_FEE);
        assertEq(segmentNFT.perCellFee(), PER_CELL_FEE);
        assertEq(segmentNFT.minGenerations(), 10);
        assertEq(segmentNFT.maxGenerations(), 30);
    }

    // ===========================================
    // Mint Segment Tests
    // ===========================================

    function test_MintSegment_MinGenerations() public {
        uint8 nGenerations = 10;
        bytes memory cells = _createCells(3, 0, 0); // 3 cells, max = 10/2 = 5
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);

        // mintSegment is now onlyOwner
        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
        assertEq(segmentNFT.ownerOf(tokenId), owner);

        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.minter, owner);
        assertEq(seg.fid, 12345);
        assertEq(seg.nGenerations, 10);
        assertEq(seg.mintedAt, block.number);
    }

    function test_MintSegment_MaxGenerations() public {
        uint8 nGenerations = 30;
        bytes memory cells = _createCells(10, 0, 0); // 10 cells, max = 30/2 = 15
        uint256 fee = segmentNFT.calculateFee(nGenerations, 10);

        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.nGenerations, 30);
    }

    function test_MintSegment_ManyCells() public {
        uint8 nGenerations = 20;
        uint256 cellCount = 50; // No limit on cells
        bytes memory cells = _createCells(cellCount, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, cellCount);

        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
    }

    function test_MintSegment_NoCells() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 0);

        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
    }

    function test_MintSegment_RefundsExcess() public {
        uint8 nGenerations = 10;
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);
        uint256 excess = 0.01 ether;

        uint256 balanceBefore = owner.balance;

        vm.prank(owner);
        segmentNFT.mintSegment{value: fee + excess}(nGenerations, cells, 12345);

        uint256 balanceAfter = owner.balance;
        assertEq(balanceBefore - balanceAfter, fee, "Excess should be refunded");
    }

    function test_MintSegment_EmitsEvents() public {
        uint8 nGenerations = 10;
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);
        bytes32 expectedCellsHash = keccak256(cells);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SegmentNFT.SegmentMinted(1, owner, 12345, nGenerations, expectedCellsHash);

        vm.expectEmit(true, false, false, true);
        emit SegmentNFT.SegmentCells(1, cells);

        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_MintSegment_MintedAtIsBlockNumber() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 0);

        // Set block number
        vm.roll(1000);

        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);

        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.mintedAt, 1000);
    }

    function test_RevertWhen_MintSegment_TooFewGenerations() public {
        uint8 nGenerations = 9; // < minGenerations (10)
        bytes memory cells = new bytes(0);
        uint256 fee = 1 ether;

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: invalid generation count");
        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_MintSegment_TooManyGenerations() public {
        uint8 nGenerations = 31; // > maxGenerations (30)
        bytes memory cells = new bytes(0);
        uint256 fee = 1 ether;

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: invalid generation count");
        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_MintSegment_CellOutOfBounds() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(3);
        cells[0] = bytes1(uint8(64)); // x = 64 (out of bounds)
        cells[1] = bytes1(uint8(0));
        cells[2] = bytes1(uint8(0));
        uint256 fee = 1 ether;

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: cell out of bounds");
        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_MintSegment_InvalidColorIndex() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(3);
        cells[0] = bytes1(uint8(0));
        cells[1] = bytes1(uint8(0));
        cells[2] = bytes1(uint8(16)); // colorIndex = 16 (invalid)
        uint256 fee = 1 ether;

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: invalid color index");
        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    // NOTE: Duplicate coordinate check has been removed for gas efficiency
    // Duplicate handling is now done client-side
    function test_MintSegment_AllowsDuplicateCoordinates() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(6);
        // First cell at (0, 0)
        cells[0] = bytes1(uint8(0));
        cells[1] = bytes1(uint8(0));
        cells[2] = bytes1(uint8(1));
        // Second cell at (0, 0) - duplicate (now allowed)
        cells[3] = bytes1(uint8(0));
        cells[4] = bytes1(uint8(0));
        cells[5] = bytes1(uint8(2));
        uint256 fee = segmentNFT.calculateFee(nGenerations, 2);

        vm.prank(owner);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
        assertEq(tokenId, 1);
    }

    function test_RevertWhen_MintSegment_InsufficientPayment() public {
        uint8 nGenerations = 10;
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: insufficient payment");
        segmentNFT.mintSegment{value: fee - 1}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_MintSegment_InvalidCellsEncoding() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(4); // Not divisible by 3
        uint256 fee = 1 ether;

        vm.prank(owner);
        vm.expectRevert("SegmentNFT: invalid cells encoding");
        segmentNFT.mintSegment{value: fee}(nGenerations, cells, 12345);
    }

    // ===========================================
    // Token URI Tests
    // ===========================================

    function test_TokenURI() public {
        uint8 nGenerations = 15;
        vm.prank(user1);
        uint256 tokenId = segmentNFT.mintSegment{value: 0.001 ether}(nGenerations, new bytes(0), 12345);

        string memory uri = segmentNFT.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function test_RevertWhen_TokenURI_NonExistentToken() public {
        vm.expectRevert("SegmentNFT: token does not exist");
        segmentNFT.tokenURI(999);
    }

    // ===========================================
    // Admin Tests
    // ===========================================

    function test_SetFees() public {
        uint256 newBaseFee = 0.0001 ether;
        uint256 newPerGenFee = 0.00001 ether;
        uint256 newPerCellFee = 0.00001 ether;

        vm.prank(owner);
        segmentNFT.setFees(newBaseFee, newPerGenFee, newPerCellFee);

        assertEq(segmentNFT.baseFee(), newBaseFee);
        assertEq(segmentNFT.perGenFee(), newPerGenFee);
        assertEq(segmentNFT.perCellFee(), newPerCellFee);
    }

    function test_SetGenerationRange() public {
        vm.prank(owner);
        segmentNFT.setGenerationRange(5, 50);

        assertEq(segmentNFT.minGenerations(), 5);
        assertEq(segmentNFT.maxGenerations(), 50);

        // Test buying with new range
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(5, 0);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.mintSegment{value: fee}(5, cells, 12345);
        assertEq(tokenId, 1);
    }

    function test_RevertWhen_SetGenerationRange_MinZero() public {
        vm.prank(owner);
        vm.expectRevert("SegmentNFT: min must be > 0");
        segmentNFT.setGenerationRange(0, 30);
    }

    function test_RevertWhen_SetGenerationRange_MaxLessThanMin() public {
        vm.prank(owner);
        vm.expectRevert("SegmentNFT: max must be >= min");
        segmentNFT.setGenerationRange(20, 10);
    }

    function test_Withdraw() public {
        // Mint segment to accumulate fees
        vm.prank(user1);
        segmentNFT.mintSegment{value: 0.001 ether}(10, new bytes(0), 12345);

        uint256 contractBalance = address(segmentNFT).balance;
        assertTrue(contractBalance > 0, "Contract should have balance");

        // Fund owner so they can receive
        vm.deal(owner, 1 ether);
        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        segmentNFT.withdraw();

        assertEq(address(segmentNFT).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function test_RevertWhen_Withdraw_NoBalance() public {
        vm.prank(owner);
        vm.expectRevert("SegmentNFT: no balance");
        segmentNFT.withdraw();
    }

    function test_RevertWhen_SetFees_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        segmentNFT.setFees(0, 0, 0);
    }

    // ===========================================
    // Fee Calculation Tests
    // ===========================================

    function test_CalculateFee() public view {
        // With PER_CELL_FEE = 0
        uint256 fee10Gen0Cell = segmentNFT.calculateFee(10, 0);
        assertEq(fee10Gen0Cell, BASE_FEE + (10 * PER_GEN_FEE));

        uint256 fee20Gen5Cell = segmentNFT.calculateFee(20, 5);
        assertEq(fee20Gen5Cell, BASE_FEE + (20 * PER_GEN_FEE) + (5 * PER_CELL_FEE));

        uint256 fee30Gen15Cell = segmentNFT.calculateFee(30, 15);
        assertEq(fee30Gen15Cell, BASE_FEE + (30 * PER_GEN_FEE) + (15 * PER_CELL_FEE));
    }

    // ===========================================
    // Multiple Mints Test
    // ===========================================

    function test_MultipleMints() public {
        uint8 nGenerations = 10;
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 0);

        vm.roll(100);
        vm.prank(user1);
        uint256 tokenId1 = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 11111);

        vm.roll(200);
        vm.prank(user2);
        uint256 tokenId2 = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 22222);

        vm.roll(300);
        vm.prank(user1);
        uint256 tokenId3 = segmentNFT.mintSegment{value: fee}(nGenerations, cells, 11111);

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(tokenId3, 3);

        assertEq(segmentNFT.getSegment(tokenId1).mintedAt, 100);
        assertEq(segmentNFT.getSegment(tokenId2).mintedAt, 200);
        assertEq(segmentNFT.getSegment(tokenId3).mintedAt, 300);
    }

    // ===========================================
    // View Functions Tests (getSegments, getSegmentsByOwner, totalSupply)
    // ===========================================

    function test_TotalSupply() public {
        assertEq(segmentNFT.totalSupply(), 0);

        uint256 fee = segmentNFT.calculateFee(10, 0);

        vm.prank(user1);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);
        assertEq(segmentNFT.totalSupply(), 1);

        vm.prank(user2);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 22222);
        assertEq(segmentNFT.totalSupply(), 2);

        vm.prank(user1);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);
        assertEq(segmentNFT.totalSupply(), 3);
    }

    function test_GetSegments_Empty() public view {
        (uint256[] memory tokenIds, SegmentNFT.Segment[] memory segments, uint256 total) =
            segmentNFT.getSegments(0, 10);

        assertEq(tokenIds.length, 0);
        assertEq(segments.length, 0);
        assertEq(total, 0);
    }

    function test_GetSegments_NewestFirst() public {
        // Calculate fees first (before prank)
        uint256 fee10 = segmentNFT.calculateFee(10, 0);
        uint256 fee15 = segmentNFT.calculateFee(15, 0);
        uint256 fee20 = segmentNFT.calculateFee(20, 0);
        uint256 fee25 = segmentNFT.calculateFee(25, 0);
        uint256 fee30 = segmentNFT.calculateFee(30, 0);

        // Mint 5 segments with different generations
        vm.roll(100);
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee10}(10, new bytes(0), 11111);

        vm.roll(200);
        vm.prank(user2);
        segmentNFT.mintSegment{value: fee15}(15, new bytes(0), 22222);

        vm.roll(300);
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee20}(20, new bytes(0), 11111);

        vm.roll(400);
        vm.prank(user2);
        segmentNFT.mintSegment{value: fee25}(25, new bytes(0), 22222);

        vm.roll(500);
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee30}(30, new bytes(0), 11111);

        // Get all segments (newest first)
        (uint256[] memory tokenIds, SegmentNFT.Segment[] memory segs, uint256 total) =
            segmentNFT.getSegments(0, 10);

        assertEq(total, 5);
        assertEq(tokenIds.length, 5);

        // Check order (newest first: 5, 4, 3, 2, 1)
        assertEq(tokenIds[0], 5);
        assertEq(tokenIds[1], 4);
        assertEq(tokenIds[2], 3);
        assertEq(tokenIds[3], 2);
        assertEq(tokenIds[4], 1);

        // Check segment data
        assertEq(segs[0].nGenerations, 30); // token 5
        assertEq(segs[1].nGenerations, 25); // token 4
        assertEq(segs[2].nGenerations, 20); // token 3
    }

    function test_GetSegments_Pagination() public {
        uint256 fee = segmentNFT.calculateFee(10, 0);

        // Mint 5 segments
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user1);
            segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);
        }

        // Get first 2 (offset 0, limit 2)
        (uint256[] memory page1, , uint256 total1) = segmentNFT.getSegments(0, 2);
        assertEq(total1, 5);
        assertEq(page1.length, 2);
        assertEq(page1[0], 5); // newest
        assertEq(page1[1], 4);

        // Get next 2 (offset 2, limit 2)
        (uint256[] memory page2, , ) = segmentNFT.getSegments(2, 2);
        assertEq(page2.length, 2);
        assertEq(page2[0], 3);
        assertEq(page2[1], 2);

        // Get last 1 (offset 4, limit 2)
        (uint256[] memory page3, , ) = segmentNFT.getSegments(4, 2);
        assertEq(page3.length, 1);
        assertEq(page3[0], 1); // oldest
    }

    function test_GetSegments_OffsetBeyondTotal() public {
        uint256 fee = segmentNFT.calculateFee(10, 0);

        // Mint 2 segments
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);

        // Offset beyond total
        (uint256[] memory tokenIds, SegmentNFT.Segment[] memory segs, uint256 total) =
            segmentNFT.getSegments(10, 5);

        assertEq(total, 2);
        assertEq(tokenIds.length, 0);
        assertEq(segs.length, 0);
    }

    function test_GetSegmentsByOwner_Empty() public view {
        (uint256[] memory tokenIds, SegmentNFT.Segment[] memory segs, uint256 total) =
            segmentNFT.getSegmentsByOwner(user1, 0, 10);

        assertEq(tokenIds.length, 0);
        assertEq(segs.length, 0);
        assertEq(total, 0);
    }

    function test_GetSegmentsByOwner_FiltersCorrectly() public {
        // Calculate fees first (before prank)
        uint256 fee10 = segmentNFT.calculateFee(10, 0);
        uint256 fee15 = segmentNFT.calculateFee(15, 0);
        uint256 fee20 = segmentNFT.calculateFee(20, 0);
        uint256 fee25 = segmentNFT.calculateFee(25, 0);
        uint256 fee30 = segmentNFT.calculateFee(30, 0);

        // User1 mints 3, User2 mints 2
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee10}(10, new bytes(0), 11111); // token 1

        vm.prank(user2);
        segmentNFT.mintSegment{value: fee15}(15, new bytes(0), 22222); // token 2

        vm.prank(user1);
        segmentNFT.mintSegment{value: fee20}(20, new bytes(0), 11111); // token 3

        vm.prank(user2);
        segmentNFT.mintSegment{value: fee25}(25, new bytes(0), 22222); // token 4

        vm.prank(user1);
        segmentNFT.mintSegment{value: fee30}(30, new bytes(0), 11111); // token 5

        // Get user1's segments
        (uint256[] memory user1Tokens, SegmentNFT.Segment[] memory user1Segs, uint256 user1Total) =
            segmentNFT.getSegmentsByOwner(user1, 0, 10);

        assertEq(user1Total, 3);
        assertEq(user1Tokens.length, 3);
        // Newest first: 5, 3, 1
        assertEq(user1Tokens[0], 5);
        assertEq(user1Tokens[1], 3);
        assertEq(user1Tokens[2], 1);
        assertEq(user1Segs[0].nGenerations, 30);
        assertEq(user1Segs[1].nGenerations, 20);
        assertEq(user1Segs[2].nGenerations, 10);

        // Get user2's segments
        (uint256[] memory user2Tokens, , uint256 user2Total) =
            segmentNFT.getSegmentsByOwner(user2, 0, 10);

        assertEq(user2Total, 2);
        assertEq(user2Tokens.length, 2);
        // Newest first: 4, 2
        assertEq(user2Tokens[0], 4);
        assertEq(user2Tokens[1], 2);
    }

    function test_GetSegmentsByOwner_Pagination() public {
        uint256 fee = segmentNFT.calculateFee(10, 0);

        // User1 mints 5 segments
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user1);
            segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);
        }

        // Get first 2
        (uint256[] memory page1, , uint256 total) = segmentNFT.getSegmentsByOwner(user1, 0, 2);
        assertEq(total, 5);
        assertEq(page1.length, 2);
        assertEq(page1[0], 5);
        assertEq(page1[1], 4);

        // Get next 2
        (uint256[] memory page2, , ) = segmentNFT.getSegmentsByOwner(user1, 2, 2);
        assertEq(page2.length, 2);
        assertEq(page2[0], 3);
        assertEq(page2[1], 2);
    }

    function test_GetSegmentsByOwner_NoTokensOwned() public {
        uint256 fee = segmentNFT.calculateFee(10, 0);

        // User1 mints
        vm.prank(user1);
        segmentNFT.mintSegment{value: fee}(10, new bytes(0), 12345);

        // Query for user2 (owns nothing)
        (uint256[] memory tokenIds, , uint256 total) =
            segmentNFT.getSegmentsByOwner(user2, 0, 10);

        assertEq(total, 0);
        assertEq(tokenIds.length, 0);
    }

    // ===========================================
    // Helper Functions
    // ===========================================

    function _createCells(uint256 count, uint8 startX, uint8 startY) internal pure returns (bytes memory) {
        bytes memory cells = new bytes(count * 3);
        for (uint256 i = 0; i < count; i++) {
            uint8 x = uint8((startX + i) % 64);
            uint8 y = uint8((startY + i / 64) % 64);
            uint8 colorIndex = uint8(i % 16);
            cells[i * 3] = bytes1(x);
            cells[i * 3 + 1] = bytes1(y);
            cells[i * 3 + 2] = bytes1(colorIndex);
        }
        return cells;
    }

    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory prefixBytes = bytes(prefix);
        if (strBytes.length < prefixBytes.length) return false;
        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (strBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }
}
