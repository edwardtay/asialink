// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYieldEscrow {
    struct Deposit {
        address depositor;
        uint256 amount;
        uint256 sharesInVault;
        bytes32 payeeDetails;
        bytes32 paymentMethod;
        bool acceptingIntents;
    }

    struct Intent {
        address buyer;
        address to;
        uint256 depositId;
        uint256 amount;
        uint256 fiatAmount;
        bytes32 fiatCurrency;
        uint256 expiryTime;
        bool fulfilled;
    }

    event DepositCreated(uint256 indexed depositId, address indexed depositor, uint256 amount);
    event DepositRouted(uint256 indexed depositId, uint256 sharesReceived);
    event IntentSignaled(bytes32 indexed intentHash, uint256 indexed depositId, address buyer, uint256 amount);
    event IntentFulfilled(bytes32 indexed intentHash, address indexed to, uint256 amount);
    event IntentCancelled(bytes32 indexed intentHash);
    event FundsWithdrawn(uint256 indexed depositId, uint256 amount, uint256 yieldEarned);
}
