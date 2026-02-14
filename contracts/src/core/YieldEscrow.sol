// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IPaymentVerifier} from "../interfaces/IPaymentVerifier.sol";
import {IYieldEscrow} from "../interfaces/IYieldEscrow.sol";

/// @title YieldEscrow
/// @notice The core contract that connects P2P fiat on/off-ramp with yield generation.
///         Liquidity providers deposit USDC -> routed to StableNestVault for yield ->
///         buyers signal intents -> verify fiat payment -> escrow releases USDC.
///         LPs earn yield on idle capital while waiting for P2P matches.
contract YieldEscrow is IYieldEscrow, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IERC4626 public immutable vault;

    mapping(uint256 => Deposit) public deposits;
    mapping(bytes32 => Intent) public intents;
    mapping(address => uint256[]) public accountDeposits;
    mapping(uint256 => bytes32[]) public depositIntentHashes;

    IPaymentVerifier public paymentVerifier;

    uint256 public depositCounter;
    uint256 public intentCounter;
    uint256 public intentExpirationPeriod = 2 hours;
    uint256 public protocolFeeBps = 50; // 0.5%
    address public feeRecipient;

    uint256 internal constant BPS = 10_000;

    error InvalidAmount();
    error DepositNotFound();
    error DepositNotAccepting();
    error IntentNotFound();
    error IntentExpired();
    error IntentAlreadyFulfilled();
    error NotIntentOwner();
    error NotDepositor();
    error VerificationFailed();
    error AmountExceedsDeposit();
    error InsufficientRedemption();

    constructor(
        IERC20 _usdc,
        IERC4626 _vault,
        IPaymentVerifier _verifier,
        address _feeRecipient
    ) {
        usdc = _usdc;
        vault = _vault;
        paymentVerifier = _verifier;
        feeRecipient = _feeRecipient;
    }

    // ============================================================
    //                    LP (SELLER) FUNCTIONS
    // ============================================================

    function createDeposit(
        uint256 _amount,
        bytes32 _payeeDetails,
        bytes32 _paymentMethod
    ) external nonReentrant whenNotPaused returns (uint256 depositId) {
        if (_amount == 0) revert InvalidAmount();

        depositId = depositCounter++;

        usdc.safeTransferFrom(msg.sender, address(this), _amount);

        // Route to vault for yield
        usdc.safeApprove(address(vault), 0);
        usdc.safeApprove(address(vault), _amount);
        uint256 shares = vault.deposit(_amount, address(this));

        deposits[depositId] = Deposit({
            depositor: msg.sender,
            amount: _amount,
            sharesInVault: shares,
            payeeDetails: _payeeDetails,
            paymentMethod: _paymentMethod,
            acceptingIntents: true,
            lockedAmount: 0
        });

        accountDeposits[msg.sender].push(depositId);

        emit DepositCreated(depositId, msg.sender, _amount);
        emit DepositRouted(depositId, shares);
    }

    function addFunds(uint256 _depositId, uint256 _amount) external nonReentrant {
        Deposit storage dep = deposits[_depositId];
        if (dep.depositor != msg.sender) revert NotDepositor();
        if (_amount == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, address(this), _amount);
        usdc.safeApprove(address(vault), 0);
        usdc.safeApprove(address(vault), _amount);
        uint256 shares = vault.deposit(_amount, address(this));

        dep.amount += _amount;
        dep.sharesInVault += shares;
    }

    function withdrawDeposit(uint256 _depositId) external nonReentrant {
        Deposit storage dep = deposits[_depositId];
        if (dep.depositor != msg.sender) revert NotDepositor();

        uint256 withdrawable = dep.amount > dep.lockedAmount ? dep.amount - dep.lockedAmount : 0;
        if (withdrawable == 0) revert InvalidAmount();

        uint256 sharesToRedeem = (dep.sharesInVault * withdrawable) / dep.amount;
        uint256 assetsReceived = vault.redeem(sharesToRedeem, address(this), address(this));

        dep.amount -= withdrawable;
        dep.sharesInVault -= sharesToRedeem;
        if (dep.amount == 0) {
            dep.acceptingIntents = false;
        }

        uint256 yieldEarned = assetsReceived > withdrawable ? assetsReceived - withdrawable : 0;
        usdc.safeTransfer(msg.sender, assetsReceived);

        emit FundsWithdrawn(_depositId, assetsReceived, yieldEarned);
    }

    function setAcceptingIntents(uint256 _depositId, bool _accepting) external {
        if (deposits[_depositId].depositor != msg.sender) revert NotDepositor();
        deposits[_depositId].acceptingIntents = _accepting;
    }

    // ============================================================
    //                   BUYER (ON-RAMP) FUNCTIONS
    // ============================================================

    function signalIntent(
        uint256 _depositId,
        uint256 _amount,
        address _to,
        uint256 _fiatAmount,
        bytes32 _fiatCurrency
    ) external nonReentrant whenNotPaused returns (bytes32 intentHash) {
        Deposit storage dep = deposits[_depositId];
        if (dep.amount == 0) revert DepositNotFound();
        if (!dep.acceptingIntents) revert DepositNotAccepting();

        if (_amount > dep.amount - dep.lockedAmount) revert AmountExceedsDeposit();

        intentHash = keccak256(
            abi.encodePacked(intentCounter++, _depositId, msg.sender, _amount, block.timestamp)
        );

        intents[intentHash] = Intent({
            buyer: msg.sender,
            to: _to,
            depositId: _depositId,
            amount: _amount,
            fiatAmount: _fiatAmount,
            fiatCurrency: _fiatCurrency,
            expiryTime: block.timestamp + intentExpirationPeriod,
            fulfilled: false
        });

        depositIntentHashes[_depositId].push(intentHash);
        dep.lockedAmount += _amount;

        emit IntentSignaled(intentHash, _depositId, msg.sender, _amount);
    }

    function fulfillIntent(
        bytes32 _intentHash,
        bytes calldata _paymentProof,
        bytes calldata _verificationData
    ) external nonReentrant {
        Intent storage intent = intents[_intentHash];
        if (intent.buyer == address(0)) revert IntentNotFound();
        if (intent.fulfilled) revert IntentAlreadyFulfilled();
        if (block.timestamp > intent.expiryTime) revert IntentExpired();

        IPaymentVerifier.PaymentVerificationResult memory result = paymentVerifier.verifyPayment(
            IPaymentVerifier.VerifyPaymentData({
                intentHash: _intentHash,
                paymentProof: _paymentProof,
                data: _verificationData
            })
        );
        if (!result.success) revert VerificationFailed();

        Deposit storage dep = deposits[intent.depositId];

        uint256 sharesToRedeem = (dep.sharesInVault * intent.amount) / dep.amount;
        uint256 assetsReceived = vault.redeem(sharesToRedeem, address(this), address(this));
        if (assetsReceived < intent.amount) revert InsufficientRedemption();

        dep.amount -= intent.amount;
        dep.sharesInVault -= sharesToRedeem;
        dep.lockedAmount -= intent.amount;
        intent.fulfilled = true;

        uint256 fee = (intent.amount * protocolFeeBps) / BPS;
        uint256 toTransfer = intent.amount - fee;

        uint256 yieldForDepositor = assetsReceived > intent.amount
            ? assetsReceived - intent.amount
            : 0;

        usdc.safeTransfer(intent.to, toTransfer);

        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        if (yieldForDepositor > 0) {
            usdc.safeTransfer(dep.depositor, yieldForDepositor);
        }

        emit IntentFulfilled(_intentHash, intent.to, toTransfer);
    }

    function cancelIntent(bytes32 _intentHash) external {
        Intent storage intent = intents[_intentHash];
        if (intent.buyer != msg.sender) revert NotIntentOwner();
        if (intent.fulfilled) revert IntentAlreadyFulfilled();

        Deposit storage dep = deposits[intent.depositId];
        dep.lockedAmount -= intent.amount;

        intent.fulfilled = true;
        intent.expiryTime = 0;

        emit IntentCancelled(_intentHash);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    function getDepositValue(uint256 _depositId) external view returns (uint256) {
        Deposit storage dep = deposits[_depositId];
        if (dep.sharesInVault == 0) return 0;
        return vault.convertToAssets(dep.sharesInVault);
    }

    function getDepositYield(uint256 _depositId) external view returns (uint256) {
        Deposit storage dep = deposits[_depositId];
        if (dep.sharesInVault == 0) return 0;
        uint256 currentValue = vault.convertToAssets(dep.sharesInVault);
        return currentValue > dep.amount ? currentValue - dep.amount : 0;
    }

    function getAccountDeposits(address _account) external view returns (uint256[] memory) {
        return accountDeposits[_account];
    }

    // ============================================================
    //                     ADMIN FUNCTIONS
    // ============================================================

    function setPaymentVerifier(IPaymentVerifier _verifier) external onlyOwner {
        paymentVerifier = _verifier;
    }

    function setIntentExpirationPeriod(uint256 _period) external onlyOwner {
        intentExpirationPeriod = _period;
    }

    function setProtocolFee(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "max 5%");
        protocolFeeBps = _bps;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        feeRecipient = _recipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
