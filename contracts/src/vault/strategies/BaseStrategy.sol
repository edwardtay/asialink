// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStrategy} from "../../interfaces/IStrategy.sol";

// OZ v4 compatible

/// @title BaseStrategy
/// @notice Abstract base for all yield strategies. Concrete strategies implement
///         _deposit, _withdraw, and totalAssets for specific Etherlink protocols.
abstract contract BaseStrategy is IStrategy {
    using SafeERC20 for IERC20;

    IERC20 public immutable override asset;
    address public immutable vault;
    address public keeper;
    bool public override paused;
    uint256 public maxCap;
    uint256 public totalDebt;
    uint256 public lastReport;

    uint256 internal constant BPS = 10_000;
    uint256 public minLiquidityOut = 9800; // 98% minimum on withdrawal

    error OnlyVault();
    error OnlyKeeper();
    error Paused();
    error SlippageTooHigh();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != vault) revert OnlyKeeper();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor(IERC20 _asset, address _vault, uint256 _maxCap) {
        asset = _asset;
        vault = _vault;
        maxCap = _maxCap;
        keeper = msg.sender;
        lastReport = block.timestamp;
    }

    function deposit(uint256 amount) external override onlyVault whenNotPaused returns (uint256) {
        asset.safeTransferFrom(vault, address(this), amount);
        totalDebt += amount;
        return _deposit(amount);
    }

    function withdraw(uint256 amount) external override onlyVault returns (uint256) {
        uint256 before = asset.balanceOf(address(this));
        uint256 shares = _withdraw(amount);
        uint256 received = asset.balanceOf(address(this)) - before + amount;

        uint256 minOutput = (amount * minLiquidityOut) / BPS;
        if (received < minOutput) revert SlippageTooHigh();

        uint256 toTransfer = received < amount ? received : amount;
        asset.safeTransfer(vault, toTransfer);
        totalDebt = totalDebt > toTransfer ? totalDebt - toTransfer : 0;
        return shares;
    }

    function report() external override onlyKeeper returns (uint256 gain, uint256 loss) {
        uint256 current = totalAssets();
        if (current > totalDebt) {
            gain = current - totalDebt;
        } else {
            loss = totalDebt - current;
        }
        totalDebt = current;
        lastReport = block.timestamp;
    }

    function maxDeposit(address) external view override returns (uint256) {
        uint256 current = totalAssets();
        return current >= maxCap ? 0 : maxCap - current;
    }

    function maxWithdraw(address) external view override returns (uint256) {
        return totalAssets();
    }

    function pause() external override onlyKeeper {
        paused = true;
    }

    function unpause() external override onlyKeeper {
        paused = false;
    }

    // --- Abstract ---
    function _deposit(uint256 amount) internal virtual returns (uint256);
    function _withdraw(uint256 amount) internal virtual returns (uint256);
    function totalAssets() public view virtual override returns (uint256);
}
