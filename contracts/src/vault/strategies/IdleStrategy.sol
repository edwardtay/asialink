// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BaseStrategy} from "./BaseStrategy.sol";

/// @title IdleStrategy
/// @notice Fallback strategy that simulates fixed-rate yield for testing.
///         In production, replace with Curve/Gearbox/Superlend adapters.
contract IdleStrategy is BaseStrategy {
    uint256 public annualRateBps; // e.g., 400 = 4%
    uint256 public depositTimestamp;
    uint256 public principal;

    constructor(
        IERC20 _asset,
        address _vault,
        uint256 _maxCap,
        uint256 _annualRateBps
    ) BaseStrategy(_asset, _vault, _maxCap) {
        annualRateBps = _annualRateBps;
    }

    function totalAssets() public view override returns (uint256) {
        if (principal == 0) return 0;
        uint256 elapsed = block.timestamp - depositTimestamp;
        uint256 interest = (principal * annualRateBps * elapsed) / (BPS * 365.25 days);
        return principal + interest;
    }

    function _deposit(uint256 amount) internal override returns (uint256) {
        // Accrue interest on existing principal first
        if (principal > 0) {
            principal = totalAssets();
        }
        principal += amount;
        depositTimestamp = block.timestamp;
        return amount;
    }

    function _withdraw(uint256 amount) internal override returns (uint256) {
        uint256 current = totalAssets();
        uint256 toWithdraw = amount < current ? amount : current;
        principal = current - toWithdraw;
        depositTimestamp = block.timestamp;
        return toWithdraw;
    }
}
