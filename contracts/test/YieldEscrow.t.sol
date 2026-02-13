// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {StableNestVault} from "../src/vault/StableNestVault.sol";
import {YieldEscrow} from "../src/core/YieldEscrow.sol";
import {IdleStrategy} from "../src/vault/strategies/IdleStrategy.sol";
import {MockVerifier} from "../src/verifier/MockVerifier.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IPaymentVerifier} from "../src/interfaces/IPaymentVerifier.sol";

contract YieldEscrowTest is Test {
    MockUSDC usdc;
    StableNestVault vault;
    IdleStrategy strategy;
    MockVerifier verifier;
    YieldEscrow escrow;

    address lp = makeAddr("lp");
    address buyer = makeAddr("buyer");
    address recipient = makeAddr("recipient");

    uint256 constant DEPOSIT_AMOUNT = 10_000e6; // 10k USDC

    function setUp() public {
        usdc = new MockUSDC();
        vault = new StableNestVault(IERC20(address(usdc)));
        strategy = new IdleStrategy(IERC20(address(usdc)), address(vault), 1_000_000e6, 400);
        vault.addStrategy(address(strategy), 10_000, 1_000_000e6);
        verifier = new MockVerifier();
        escrow = new YieldEscrow(
            IERC20(address(usdc)),
            IERC4626(address(vault)),
            IPaymentVerifier(address(verifier)),
            address(this) // fee recipient
        );

        // Fund LP
        usdc.mint(lp, 100_000e6);
        vm.prank(lp);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_CreateDeposit() public {
        vm.prank(lp);
        uint256 depositId = escrow.createDeposit(
            DEPOSIT_AMOUNT,
            keccak256("venmo:@myuser"),
            keccak256("venmo")
        );

        (
            address depositor,
            uint256 amount,
            uint256 shares,
            ,
            ,
            bool accepting
        ) = escrow.deposits(depositId);

        assertEq(depositor, lp);
        assertEq(amount, DEPOSIT_AMOUNT);
        assertGt(shares, 0);
        assertTrue(accepting);
    }

    function test_DepositRoutedToVault() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        uint256 vaultBalance = vault.balanceOf(address(escrow));
        assertGt(vaultBalance, 0);

        uint256 depositValue = escrow.getDepositValue(0);
        assertGe(depositValue, DEPOSIT_AMOUNT);
    }

    function test_SignalIntent() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        vm.prank(buyer);
        bytes32 intentHash = escrow.signalIntent(
            0, 1_000e6, recipient, 1_000_00, keccak256("USD")
        );

        (
            address intentBuyer,
            address to,
            uint256 depositId,
            uint256 amount,
            ,
            ,
            uint256 expiryTime,
            bool fulfilled
        ) = escrow.intents(intentHash);

        assertEq(intentBuyer, buyer);
        assertEq(to, recipient);
        assertEq(depositId, 0);
        assertEq(amount, 1_000e6);
        assertFalse(fulfilled);
        assertGt(expiryTime, block.timestamp);
    }

    function test_FulfillIntent() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        vm.prank(buyer);
        bytes32 intentHash = escrow.signalIntent(
            0, 1_000e6, recipient, 1_000_00, keccak256("USD")
        );

        uint256 recipientBefore = usdc.balanceOf(recipient);
        escrow.fulfillIntent(intentHash, "", abi.encode(uint256(1_000e6)));
        uint256 recipientAfter = usdc.balanceOf(recipient);

        uint256 fee = (1_000e6 * 50) / 10_000;
        assertEq(recipientAfter - recipientBefore, 1_000e6 - fee);

        (, , , , , , , bool fulfilled) = escrow.intents(intentHash);
        assertTrue(fulfilled);
    }

    function test_YieldAccrual() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        // Rebalance to push funds into yield strategy
        vault.rebalance();

        // Warp forward 30 days for yield to accrue
        vm.warp(block.timestamp + 30 days);

        uint256 yieldAmount = escrow.getDepositYield(0);
        uint256 value = escrow.getDepositValue(0);

        assertGt(yieldAmount, 0, "should have earned yield");
        assertGt(value, DEPOSIT_AMOUNT, "value should exceed principal");
        console.log("Yield after 30 days on 10k USDC:", yieldAmount);
    }

    function test_WithdrawWithYield() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        // Rebalance to push funds into yield strategy
        vault.rebalance();

        // Warp forward 30 days for yield to accrue
        vm.warp(block.timestamp + 30 days);

        // Simulate real yield by minting USDC to strategy
        // (in production, Curve/Gearbox generate real yield tokens)
        uint256 simulatedYield = escrow.getDepositYield(0);
        usdc.mint(address(strategy), simulatedYield);

        uint256 lpBefore = usdc.balanceOf(lp);

        vm.prank(lp);
        escrow.withdrawDeposit(0);

        uint256 received = usdc.balanceOf(lp) - lpBefore;
        assertGt(received, DEPOSIT_AMOUNT, "should receive principal + yield");
        console.log("LP received:", received, "on deposit of:", DEPOSIT_AMOUNT);
    }

    function test_CancelIntent() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        vm.prank(buyer);
        bytes32 intentHash = escrow.signalIntent(
            0, 1_000e6, recipient, 1_000_00, keccak256("USD")
        );

        vm.prank(buyer);
        escrow.cancelIntent(intentHash);

        (, , , , , , , bool fulfilled) = escrow.intents(intentHash);
        assertTrue(fulfilled);
    }

    function test_CannotExceedDeposit() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        vm.prank(buyer);
        vm.expectRevert(YieldEscrow.AmountExceedsDeposit.selector);
        escrow.signalIntent(0, DEPOSIT_AMOUNT + 1, recipient, 1_000_00, keccak256("USD"));
    }

    function test_IntentExpiry() public {
        vm.prank(lp);
        escrow.createDeposit(DEPOSIT_AMOUNT, keccak256("venmo:@myuser"), keccak256("venmo"));

        vm.prank(buyer);
        bytes32 intentHash = escrow.signalIntent(
            0, 1_000e6, recipient, 1_000_00, keccak256("USD")
        );

        vm.warp(block.timestamp + 3 hours);

        vm.expectRevert(YieldEscrow.IntentExpired.selector);
        escrow.fulfillIntent(intentHash, "", abi.encode(uint256(1_000e6)));
    }
}
