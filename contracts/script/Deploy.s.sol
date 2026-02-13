// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StableNestVault} from "../src/vault/StableNestVault.sol";
import {YieldEscrow} from "../src/core/YieldEscrow.sol";
import {IdleStrategy} from "../src/vault/strategies/IdleStrategy.sol";
import {MockVerifier} from "../src/verifier/MockVerifier.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IPaymentVerifier} from "../src/interfaces/IPaymentVerifier.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy mock USDC for testnet
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));

        // Deploy vault (owner = deployer via OZ v4 Ownable)
        StableNestVault vault = new StableNestVault(IERC20(address(usdc)));
        console.log("StableNestVault:", address(vault));

        // Deploy idle strategy (4% APY for testing)
        IdleStrategy strategy = new IdleStrategy(
            IERC20(address(usdc)),
            address(vault),
            1_000_000e6, // 1M USDC cap
            400 // 4% annual
        );
        console.log("IdleStrategy:", address(strategy));

        // Register strategy (100% weight)
        vault.addStrategy(address(strategy), 10_000, 1_000_000e6);

        // Deploy mock verifier
        MockVerifier verifier = new MockVerifier();
        console.log("MockVerifier:", address(verifier));

        // Deploy yield escrow
        YieldEscrow escrow = new YieldEscrow(
            IERC20(address(usdc)),
            IERC4626(address(vault)),
            IPaymentVerifier(address(verifier)),
            deployer // fee recipient
        );
        console.log("YieldEscrow:", address(escrow));

        // Mint test USDC
        usdc.mint(deployer, 100_000e6);

        vm.stopBroadcast();
    }
}
