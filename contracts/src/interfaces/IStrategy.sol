// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStrategy {
    function asset() external view returns (IERC20);
    function totalAssets() external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 amount) external returns (uint256 shares);
    function report() external returns (uint256 gain, uint256 loss);
    function paused() external view returns (bool);
    function pause() external;
    function unpause() external;
}
