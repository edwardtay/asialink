// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";

/// @title StableNestVault
/// @notice ERC-4626 yield aggregator vault for USDC on Etherlink.
///         Routes deposits across Curve, Gearbox, and Superlend strategies.
///         Issues eUSDC (yield-bearing receipt token) to depositors.
contract StableNestVault is ERC4626, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    struct StrategyConfig {
        uint256 targetWeight; // BPS (10000 = 100%)
        uint256 maxCap;
        bool active;
    }

    mapping(address => StrategyConfig) public strategies;
    address[] public strategyList;

    uint256 public withdrawBuffer = 800; // 8% kept idle for instant withdrawals
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_STRATEGIES = 10;

    uint256 public lastRebalance;

    error StrategyAlreadyAdded();
    error StrategyNotActive();
    error TooManyStrategies();
    error InvalidWeight();
    error InsufficientLiquidity();

    constructor(
        IERC20 _usdc
    )
        ERC4626(_usdc)
        ERC20("StableNest USD", "eUSDC")
    {}

    // --- Views ---

    function totalAssets() public view override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) {
                total += IStrategy(strategyList[i]).totalAssets();
            }
        }
        return total;
    }

    function getStrategyCount() external view returns (uint256) {
        return strategyList.length;
    }

    function getTotalStrategyAssets() external view returns (uint256 total) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) {
                total += IStrategy(strategyList[i]).totalAssets();
            }
        }
    }

    // --- Strategy Management ---

    function addStrategy(
        address _strategy,
        uint256 _targetWeight,
        uint256 _maxCap
    ) external onlyOwner {
        if (strategies[_strategy].active) revert StrategyAlreadyAdded();
        if (strategyList.length >= MAX_STRATEGIES) revert TooManyStrategies();
        if (_targetWeight == 0 || _targetWeight > BPS) revert InvalidWeight();

        strategies[_strategy] = StrategyConfig({
            targetWeight: _targetWeight,
            maxCap: _maxCap,
            active: true
        });
        strategyList.push(_strategy);

        IERC20(asset()).safeApprove(_strategy, type(uint256).max);
    }

    function removeStrategy(address _strategy) external onlyOwner {
        if (!strategies[_strategy].active) revert StrategyNotActive();

        uint256 strategyAssets = IStrategy(_strategy).totalAssets();
        if (strategyAssets > 0) {
            IStrategy(_strategy).withdraw(strategyAssets);
        }

        strategies[_strategy].active = false;
        IERC20(asset()).safeApprove(_strategy, 0);
    }

    function updateStrategy(
        address _strategy,
        uint256 _targetWeight,
        uint256 _maxCap
    ) external onlyOwner {
        if (!strategies[_strategy].active) revert StrategyNotActive();
        if (_targetWeight == 0 || _targetWeight > BPS) revert InvalidWeight();

        strategies[_strategy].targetWeight = _targetWeight;
        strategies[_strategy].maxCap = _maxCap;
    }

    // --- Rebalancing ---

    function rebalance() external nonReentrant whenNotPaused {
        uint256 total = totalAssets();
        if (total == 0) return;

        uint256 requiredBuffer = (total * withdrawBuffer) / BPS;
        uint256 allocatable = total > requiredBuffer ? total - requiredBuffer : 0;

        uint256 totalWeight;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].active) {
                totalWeight += strategies[strategyList[i]].targetWeight;
            }
        }
        if (totalWeight == 0) return;

        // Pass 1: Withdraw from over-allocated
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strat = strategyList[i];
            StrategyConfig memory cfg = strategies[strat];
            if (!cfg.active) continue;

            uint256 target = (allocatable * cfg.targetWeight) / totalWeight;
            target = target < cfg.maxCap ? target : cfg.maxCap;
            uint256 current = IStrategy(strat).totalAssets();

            if (current > target) {
                uint256 excess = current - target;
                uint256 maxW = IStrategy(strat).maxWithdraw(address(this));
                uint256 toWithdraw = excess < maxW ? excess : maxW;
                if (toWithdraw > 0) {
                    IStrategy(strat).withdraw(toWithdraw);
                }
            }
        }

        // Pass 2: Deposit to under-allocated
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 bufferNeeded = (total * withdrawBuffer) / BPS;

        for (uint256 i = 0; i < strategyList.length; i++) {
            address strat = strategyList[i];
            StrategyConfig memory cfg = strategies[strat];
            if (!cfg.active) continue;

            uint256 target = (allocatable * cfg.targetWeight) / totalWeight;
            target = target < cfg.maxCap ? target : cfg.maxCap;
            uint256 current = IStrategy(strat).totalAssets();

            if (current < target && idle > bufferNeeded) {
                uint256 deficit = target - current;
                uint256 available = idle - bufferNeeded;
                uint256 maxD = IStrategy(strat).maxDeposit(address(this));
                uint256 toDeposit = deficit < available ? deficit : available;
                toDeposit = toDeposit < maxD ? toDeposit : maxD;
                if (toDeposit > 0) {
                    IStrategy(strat).deposit(toDeposit);
                    idle -= toDeposit;
                }
            }
        }

        lastRebalance = block.timestamp;
    }

    // --- Withdraw Override ---

    function _withdraw(
        address caller,
        address receiver,
        address _owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < assets) {
            _pullFromStrategies(assets - idle);
        }
        super._withdraw(caller, receiver, _owner, assets, shares);
    }

    function _pullFromStrategies(uint256 _needed) internal {
        uint256 remaining = _needed;
        for (uint256 i = 0; i < strategyList.length && remaining > 0; i++) {
            address strat = strategyList[i];
            if (!strategies[strat].active) continue;

            uint256 avail = IStrategy(strat).maxWithdraw(address(this));
            uint256 toWithdraw = remaining < avail ? remaining : avail;
            if (toWithdraw > 0) {
                IStrategy(strat).withdraw(toWithdraw);
                remaining -= toWithdraw;
            }
        }
        if (remaining > 0) revert InsufficientLiquidity();
    }

    // --- Admin ---

    function setWithdrawBuffer(uint256 _bps) external onlyOwner {
        require(_bps <= 2000, "max 20%");
        withdrawBuffer = _bps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
