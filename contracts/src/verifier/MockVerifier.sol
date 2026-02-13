// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPaymentVerifier} from "../interfaces/IPaymentVerifier.sol";

/// @title MockVerifier
/// @notice Mock payment verifier for testing. Always returns success.
///         Replace with ReclaimVerifier for production (Reclaim Protocol zkTLS).
contract MockVerifier is IPaymentVerifier {
    bool public autoApprove = true;
    mapping(bytes32 => bool) public approvedIntents;

    event PaymentVerified(bytes32 indexed intentHash, uint256 releaseAmount);

    function verifyPayment(
        VerifyPaymentData calldata _data
    ) external override returns (PaymentVerificationResult memory) {
        bool success;
        if (autoApprove) {
            success = true;
        } else {
            success = approvedIntents[_data.intentHash];
        }

        // Decode release amount from data, or default to max
        uint256 releaseAmount;
        if (_data.data.length >= 32) {
            releaseAmount = abi.decode(_data.data, (uint256));
        } else {
            releaseAmount = type(uint256).max;
        }

        if (success) {
            emit PaymentVerified(_data.intentHash, releaseAmount);
        }

        return PaymentVerificationResult({
            success: success,
            intentHash: _data.intentHash,
            releaseAmount: releaseAmount
        });
    }

    // --- Test helpers ---

    function setAutoApprove(bool _auto) external {
        autoApprove = _auto;
    }

    function approveIntent(bytes32 _intentHash) external {
        approvedIntents[_intentHash] = true;
    }
}
