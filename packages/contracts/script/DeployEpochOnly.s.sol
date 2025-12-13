// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EpochArchiveNFT.sol";

/**
 * @title DeployEpochOnly
 * @dev Deploy only EpochArchiveNFT (when SegmentNFT already exists)
 *
 * Usage:
 *   forge script script/DeployEpochOnly.s.sol:DeployEpochOnly \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 *
 * Environment variables required:
 *   - DEPLOYER_PRIVATE_KEY: Private key for deployment
 *   - EPOCH_MINTER_ADDRESS: Address authorized to mint epochs
 *   - SEGMENT_NFT_ADDRESS: Existing SegmentNFT contract address
 */
contract DeployEpochOnly is Script {
    uint256 public constant EPOCH_MINT_PRICE = 0.0001 ether;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address epochMinter = vm.envAddress("EPOCH_MINTER_ADDRESS");
        address segmentNFT = vm.envAddress("NEXT_PUBLIC_SEGMENT_NFT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying EpochArchiveNFT only...");
        console.log("Deployer:", deployer);
        console.log("Epoch Minter:", epochMinter);
        console.log("SegmentNFT:", segmentNFT);

        EpochArchiveNFT epochNFT = new EpochArchiveNFT(
            deployer,
            epochMinter,
            segmentNFT,
            EPOCH_MINT_PRICE
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== EpochArchiveNFT Deployed ===");
        console.log("Address:", address(epochNFT));
        console.log("Mint Price:", EPOCH_MINT_PRICE);
    }
}
