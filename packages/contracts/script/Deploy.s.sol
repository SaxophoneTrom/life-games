// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SegmentNFT.sol";
import "../src/EpochNFT.sol";

/**
 * @title Deploy
 * @dev Deployment script for Infinite Life contracts
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 *
 * Environment variables required:
 *   - DEPLOYER_PRIVATE_KEY: Private key for deployment
 *   - FINALIZER_ADDRESS: Address authorized to finalize segments/epochs
 *   - BASE_SEPOLIA_RPC_URL: RPC URL for Base Sepolia
 *   - BASESCAN_API_KEY: API key for contract verification
 */
contract Deploy is Script {
    // ===========================================
    // Fee Configuration (can be adjusted)
    // ===========================================
    uint256 public constant BASE_FEE = 0.00005 ether;      // Base fee per segment
    uint256 public constant PER_GEN_FEE = 0.000005 ether;  // Fee per generation
    uint256 public constant PER_CELL_FEE = 0;              // Free cell placement

    uint256 public constant EPOCH_MINT_PRICE = 0.0001 ether; // Price to mint epoch NFT

    // ===========================================
    // Initial State (empty board)
    // ===========================================
    // For a 64x64 board with all cells dead:
    // StateV1: 512 bytes (aliveBitset) + 2048 bytes (colorNibbles) = 2560 bytes of zeros
    bytes32 public constant INITIAL_STATE_ROOT = keccak256(abi.encodePacked(bytes32(0))); // Placeholder
    string public constant INITIAL_STATE_CID = ""; // Will be set after IPFS upload

    // Ruleset hash (Conway's Game of Life with 16 color palette)
    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors - v1");

    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address finalizer = vm.envAddress("FINALIZER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts...");
        console.log("Deployer:", deployer);
        console.log("Finalizer:", finalizer);

        // Deploy SegmentNFT
        SegmentNFT segmentNFT = new SegmentNFT(
            deployer,           // owner
            finalizer,          // finalizer
            RULESET_HASH,       // rulesetHash
            INITIAL_STATE_ROOT, // initialStateRoot
            INITIAL_STATE_CID,  // initialStateCID
            BASE_FEE,           // baseFee
            PER_GEN_FEE,        // perGenFee
            PER_CELL_FEE        // perCellFee (0 = free cell placement)
        );

        console.log("SegmentNFT deployed at:", address(segmentNFT));

        // Deploy EpochNFT
        EpochNFT epochNFT = new EpochNFT(
            deployer,            // owner
            finalizer,           // finalizer
            address(segmentNFT), // segmentNFT
            EPOCH_MINT_PRICE     // mintPrice
        );

        console.log("EpochNFT deployed at:", address(epochNFT));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("SegmentNFT:", address(segmentNFT));
        console.log("EpochNFT:", address(epochNFT));
        console.log("");
        console.log("Fee Configuration:");
        console.log("  Base Fee:", BASE_FEE);
        console.log("  Per Gen Fee:", PER_GEN_FEE);
        console.log("  Per Cell Fee:", PER_CELL_FEE);
        console.log("  Epoch Mint Price:", EPOCH_MINT_PRICE);
    }
}

/**
 * @title DeployTestnet
 * @dev Simplified deployment for testnet with lower fees
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address finalizer = vm.envAddress("FINALIZER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        // Deploy with minimal fees for testing
        SegmentNFT segmentNFT = new SegmentNFT(
            deployer,
            finalizer,
            keccak256("test-ruleset"),
            keccak256("initial"),
            "",
            0.00001 ether, // Lower base fee for testing
            0.000001 ether, // Lower per-gen fee
            0               // Free cells
        );

        EpochNFT epochNFT = new EpochNFT(
            deployer,
            finalizer,
            address(segmentNFT),
            0.00001 ether // Lower epoch mint price
        );

        vm.stopBroadcast();

        console.log("=== Testnet Deployment ===");
        console.log("SegmentNFT:", address(segmentNFT));
        console.log("EpochNFT:", address(epochNFT));
    }
}
