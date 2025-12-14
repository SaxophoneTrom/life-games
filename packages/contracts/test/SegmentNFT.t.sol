// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SegmentNFT.sol";

contract SegmentNFTTest is Test {
    SegmentNFT public segmentNFT;

    address public owner = address(0x1001);
    address public finalizer = address(0x1002);
    address public user1 = address(0x1003);
    address public user2 = address(0x1004);

    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors");
    bytes32 public constant INITIAL_STATE_ROOT = keccak256("initial state");
    string public constant INITIAL_STATE_CID = "QmInitialState";

    uint256 public constant BASE_FEE = 0.00005 ether;
    uint256 public constant PER_GEN_FEE = 0.000005 ether;
    uint256 public constant PER_CELL_FEE = 0; // Free cell placement

    function setUp() public {
        segmentNFT = new SegmentNFT(
            owner,
            finalizer,
            RULESET_HASH,
            INITIAL_STATE_ROOT,
            INITIAL_STATE_CID,
            BASE_FEE,
            PER_GEN_FEE,
            PER_CELL_FEE
        );

        // Fund test users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // ===========================================
    // Constructor Tests
    // ===========================================

    function test_Constructor() public view {
        assertEq(segmentNFT.owner(), owner);
        assertEq(segmentNFT.finalizer(), finalizer);
        assertEq(segmentNFT.rulesetHash(), RULESET_HASH);
        assertEq(segmentNFT.currentStateRoot(), INITIAL_STATE_ROOT);
        assertEq(segmentNFT.currentStateCID(), INITIAL_STATE_CID);
        assertEq(segmentNFT.currentGen(), 0);
        assertEq(segmentNFT.nextTokenId(), 1);
        assertEq(segmentNFT.baseFee(), BASE_FEE);
        assertEq(segmentNFT.perGenFee(), PER_GEN_FEE);
        assertEq(segmentNFT.perCellFee(), PER_CELL_FEE);
    }

    // ===========================================
    // Buy Segment Tests
    // ===========================================

    function test_BuySegment_MinGenerations() public {
        uint8 nGenerations = 5;
        bytes memory cells = _createCells(3, 0, 0); // 3 cells
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
        assertEq(segmentNFT.ownerOf(tokenId), user1);

        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.buyer, user1);
        assertEq(seg.fid, 12345);
        assertEq(seg.startGen, 1);
        assertEq(seg.nGenerations, 5);
        assertEq(seg.finalized, false);
    }

    function test_BuySegment_MaxGenerations() public {
        uint8 nGenerations = 30;
        bytes memory cells = _createCells(10, 0, 0); // 10 cells
        uint256 fee = segmentNFT.calculateFee(nGenerations, 10);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.nGenerations, 30);
    }

    function test_BuySegment_MaxCells() public {
        uint8 nGenerations = 10;
        uint256 maxCells = uint256(nGenerations) * 9; // 90 cells
        bytes memory cells = _createCells(maxCells, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, maxCells);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
    }

    function test_BuySegment_NoCells() public {
        uint8 nGenerations = 5;
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 0);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);

        assertEq(tokenId, 1);
    }

    function test_BuySegment_RefundsExcess() public {
        uint8 nGenerations = 5;
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);
        uint256 excess = 0.01 ether;

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        segmentNFT.buySegment{value: fee + excess}(nGenerations, cells, 12345);

        uint256 balanceAfter = user1.balance;
        assertEq(balanceBefore - balanceAfter, fee);
    }

    function test_RevertWhen_BuySegment_TooFewGenerations() public {
        uint8 nGenerations = 4; // < MIN_GENERATIONS
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = 1 ether;

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: invalid generation count");
        segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_BuySegment_TooManyGenerations() public {
        uint8 nGenerations = 31; // > MAX_GENERATIONS
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = 1 ether;

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: invalid generation count");
        segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_BuySegment_TooManyCells() public {
        uint8 nGenerations = 5;
        uint256 maxCells = uint256(nGenerations) * 9 + 1; // 46 cells (too many)
        bytes memory cells = _createCells(maxCells, 0, 0);
        uint256 fee = 1 ether;

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: too many cells");
        segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_BuySegment_CellOutOfBounds() public {
        uint8 nGenerations = 5;
        bytes memory cells = new bytes(3);
        cells[0] = bytes1(uint8(64)); // x = 64 (out of bounds)
        cells[1] = bytes1(uint8(0));
        cells[2] = bytes1(uint8(0));
        uint256 fee = 1 ether;

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: cell out of bounds");
        segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_BuySegment_InvalidColorIndex() public {
        uint8 nGenerations = 5;
        bytes memory cells = new bytes(3);
        cells[0] = bytes1(uint8(0));
        cells[1] = bytes1(uint8(0));
        cells[2] = bytes1(uint8(16)); // colorIndex = 16 (invalid)
        uint256 fee = 1 ether;

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: invalid color index");
        segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);
    }

    function test_RevertWhen_BuySegment_InsufficientPayment() public {
        uint8 nGenerations = 5;
        bytes memory cells = _createCells(3, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 3);

        vm.prank(user1);
        vm.expectRevert("SegmentNFT: insufficient payment");
        segmentNFT.buySegment{value: fee - 1}(nGenerations, cells, 12345);
    }

    // ===========================================
    // Finalize Segment Tests
    // ===========================================

    function test_FinalizeSegment() public {
        // First buy a segment
        uint8 nGenerations = 10;
        bytes memory cells = _createCells(5, 0, 0);
        uint256 fee = segmentNFT.calculateFee(nGenerations, 5);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(nGenerations, cells, 12345);

        // Finalize
        bytes32 endStateRoot = keccak256("end state");
        string memory endStateCID = "QmEndState";
        string memory metadataURI = "ipfs://QmMetadata";

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(tokenId, endStateRoot, endStateCID, metadataURI);

        SegmentNFT.Segment memory seg = segmentNFT.getSegment(tokenId);
        assertEq(seg.finalized, true);
        assertEq(seg.endStateRoot, endStateRoot);
        assertEq(seg.endStateCID, endStateCID);
        assertEq(seg.metadataURI, metadataURI);

        // Check global state updated
        assertEq(segmentNFT.currentGen(), 10);
        assertEq(segmentNFT.currentStateRoot(), endStateRoot);
        assertEq(segmentNFT.currentStateCID(), endStateCID);
    }

    function test_RevertWhen_FinalizeSegment_NotFinalizer() public {
        // Buy segment
        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: 0.001 ether}(5, new bytes(0), 12345);

        // Try to finalize as non-finalizer
        vm.prank(user1);
        vm.expectRevert("SegmentNFT: caller is not finalizer");
        segmentNFT.finalizeSegment(tokenId, bytes32(0), "", "");
    }

    function test_RevertWhen_FinalizeSegment_AlreadyFinalized() public {
        // Buy and finalize
        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: 0.001 ether}(5, new bytes(0), 12345);

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(tokenId, keccak256("end"), "cid", "uri");

        // Try to finalize again
        vm.prank(finalizer);
        vm.expectRevert("SegmentNFT: already finalized");
        segmentNFT.finalizeSegment(tokenId, keccak256("end2"), "cid2", "uri2");
    }

    // ===========================================
    // Token URI Tests
    // ===========================================

    function test_TokenURI_Pending() public {
        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: 0.001 ether}(5, new bytes(0), 12345);

        string memory uri = segmentNFT.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function test_TokenURI_Finalized() public {
        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: 0.001 ether}(5, new bytes(0), 12345);

        string memory metadataURI = "ipfs://QmMetadata123";

        vm.prank(finalizer);
        segmentNFT.finalizeSegment(tokenId, keccak256("end"), "cid", metadataURI);

        string memory uri = segmentNFT.tokenURI(tokenId);
        assertEq(uri, metadataURI);
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

    function test_SetFinalizer() public {
        address newFinalizer = address(100);

        vm.prank(owner);
        segmentNFT.setFinalizer(newFinalizer);

        assertEq(segmentNFT.finalizer(), newFinalizer);
    }

    function test_SetGenerationRange() public {
        vm.prank(owner);
        segmentNFT.setGenerationRange(10, 50);

        assertEq(segmentNFT.minGenerations(), 10);
        assertEq(segmentNFT.maxGenerations(), 50);

        // Test buying with new range
        bytes memory cells = new bytes(0);
        uint256 fee = segmentNFT.calculateFee(10, 0);

        vm.prank(user1);
        uint256 tokenId = segmentNFT.buySegment{value: fee}(10, cells, 12345);
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

    function test_RevertWhen_BuySegment_BelowNewMin() public {
        // Change min to 10
        vm.prank(owner);
        segmentNFT.setGenerationRange(10, 30);

        // Try to buy with 5 generations (below new min)
        vm.prank(user1);
        vm.expectRevert("SegmentNFT: invalid generation count");
        segmentNFT.buySegment{value: 1 ether}(5, new bytes(0), 12345);
    }

    function test_Withdraw() public {
        // Buy segment to accumulate fees
        vm.prank(user1);
        segmentNFT.buySegment{value: 0.001 ether}(5, new bytes(0), 12345);

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

    // ===========================================
    // Checkpoint Tests
    // ===========================================

    function test_RecordCheckpoint() public {
        bytes32 boundaryRoot = keccak256("boundary 256");
        string memory boundaryCID = "QmBoundary256";

        vm.prank(finalizer);
        segmentNFT.recordCheckpoint(256, boundaryRoot, boundaryCID);

        assertEq(segmentNFT.checkpointRoots(256), boundaryRoot);
        assertEq(segmentNFT.checkpointCIDs(256), boundaryCID);
    }

    function test_RevertWhen_RecordCheckpoint_NotBoundary() public {
        vm.prank(finalizer);
        vm.expectRevert("SegmentNFT: not a 256 boundary");
        segmentNFT.recordCheckpoint(100, keccak256(""), "");
    }

    // ===========================================
    // Fee Calculation Tests
    // ===========================================

    function test_CalculateFee() public view {
        // With PER_CELL_FEE = 0
        uint256 fee5Gen0Cell = segmentNFT.calculateFee(5, 0);
        assertEq(fee5Gen0Cell, BASE_FEE + (5 * PER_GEN_FEE));

        uint256 fee10Gen5Cell = segmentNFT.calculateFee(10, 5);
        assertEq(fee10Gen5Cell, BASE_FEE + (10 * PER_GEN_FEE) + (5 * PER_CELL_FEE));

        uint256 fee30Gen90Cell = segmentNFT.calculateFee(30, 90);
        assertEq(fee30Gen90Cell, BASE_FEE + (30 * PER_GEN_FEE) + (90 * PER_CELL_FEE));
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
