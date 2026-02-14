// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMockUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IYieldEscrow {
    function createDeposit(uint256 amount, bytes32 payeeDetails, bytes32 paymentMethod) external returns (uint256);
    function depositCounter() external view returns (uint256);
}

contract SeedMarketplace is Script {
    // Deployed contract addresses (Etherlink testnet)
    address constant USDC = 0x3D101003b1f7E1dFe6f4ee7d1b587f656c3a651F;
    address constant ESCROW = 0x9510952EeE3a75769Eeb25791e3b9D7E8Eb964d2;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Current deposit counter:", IYieldEscrow(ESCROW).depositCounter());

        vm.startBroadcast(deployerKey);

        // Mint 20,000 USDC to deployer
        IMockUSDC(USDC).mint(deployer, 20_000e6);

        // Approve escrow for full amount
        IMockUSDC(USDC).approve(ESCROW, 20_000e6);

        // Create 5 deposits with realistic APAC payment methods
        // 1. GCash $5,000 (Philippines)
        IYieldEscrow(ESCROW).createDeposit(
            5_000e6,
            bytes32(bytes("@maria.gcash")),
            bytes32(bytes("GCash"))
        );
        console.log("Created: GCash $5,000");

        // 2. GrabPay $3,000 (Singapore/Malaysia)
        IYieldEscrow(ESCROW).createDeposit(
            3_000e6,
            bytes32(bytes("@lee.grabpay")),
            bytes32(bytes("GrabPay"))
        );
        console.log("Created: GrabPay $3,000");

        // 3. PromptPay $2,500 (Thailand)
        IYieldEscrow(ESCROW).createDeposit(
            2_500e6,
            bytes32(bytes("@somchai.pp")),
            bytes32(bytes("PromptPay"))
        );
        console.log("Created: PromptPay $2,500");

        // 4. Dana $1,500 (Indonesia)
        IYieldEscrow(ESCROW).createDeposit(
            1_500e6,
            bytes32(bytes("@dewi.dana")),
            bytes32(bytes("Dana"))
        );
        console.log("Created: Dana $1,500");

        // 5. PayNow $8,000 (Singapore)
        IYieldEscrow(ESCROW).createDeposit(
            8_000e6,
            bytes32(bytes("@tan.paynow")),
            bytes32(bytes("PayNow"))
        );
        console.log("Created: PayNow $8,000");

        vm.stopBroadcast();

        console.log("Seeding complete! New deposit counter:", IYieldEscrow(ESCROW).depositCounter());
    }
}
