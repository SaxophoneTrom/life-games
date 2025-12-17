// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SegmentNFT.sol";
import "../src/EpochArchiveNFT.sol";

/**
 * @title Deploy
 * @dev Deployment script for Infinite Life contracts (New Architecture)
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 *
 * Environment variables required:
 *   - DEPLOYER_PRIVATE_KEY: Private key for deployment
 *   - EPOCH_MINTER_ADDRESS: Address authorized to mint epochs (GitHub Actions bot)
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

    uint256 public constant EPOCH_MINT_PRICE = 0.0001 ether; // Price to collect epoch NFT

    // Ruleset hash (Conway's Game of Life with 16 color palette)
    bytes32 public constant RULESET_HASH = keccak256("Conway's Game of Life - 16 colors - v1");

    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address epochMinter = vm.envAddress("EPOCH_MINTER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts (New Architecture)...");
        console.log("Deployer:", deployer);
        console.log("Epoch Minter:", epochMinter);

        // Deploy SegmentNFT
        SegmentNFT segmentNFT = new SegmentNFT(
            deployer,           // owner
            RULESET_HASH,       // rulesetHash
            BASE_FEE,           // baseFee
            PER_GEN_FEE,        // perGenFee
            PER_CELL_FEE        // perCellFee (0 = free cell placement)
        );

        console.log("SegmentNFT deployed at:", address(segmentNFT));

        // Deploy EpochArchiveNFT
        EpochArchiveNFT epochNFT = new EpochArchiveNFT(
            deployer,            // owner
            epochMinter,         // epochMinter (GitHub Actions bot)
            address(segmentNFT), // segmentNFT
            EPOCH_MINT_PRICE     // mintPrice
        );

        console.log("EpochArchiveNFT deployed at:", address(epochNFT));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("SegmentNFT:", address(segmentNFT));
        console.log("EpochArchiveNFT:", address(epochNFT));
        console.log("");
        console.log("Fee Configuration:");
        console.log("  Base Fee:", BASE_FEE);
        console.log("  Per Gen Fee:", PER_GEN_FEE);
        console.log("  Per Cell Fee:", PER_CELL_FEE);
        console.log("  Epoch Mint Price:", EPOCH_MINT_PRICE);
        console.log("");
        console.log("Generation Range: 10-30");
        console.log("Max Cells: floor(nGenerations / 2)");
    }
}

/**
 * @title DeployTestnet
 * @dev Simplified deployment for testnet with lower fees
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address epochMinter = vm.envAddress("EPOCH_MINTER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        // Deploy with minimal fees for testing
        SegmentNFT segmentNFT = new SegmentNFT(
            deployer,
            keccak256("test-ruleset"),
            0.00001 ether, // Lower base fee for testing
            0.000001 ether, // Lower per-gen fee
            0               // Free cells
        );

        EpochArchiveNFT epochNFT = new EpochArchiveNFT(
            deployer,
            epochMinter,
            address(segmentNFT),
            0.00001 ether // Lower epoch mint price
        );

        vm.stopBroadcast();

        console.log("=== Testnet Deployment ===");
        console.log("SegmentNFT:", address(segmentNFT));
        console.log("EpochArchiveNFT:", address(epochNFT));
    }
}
