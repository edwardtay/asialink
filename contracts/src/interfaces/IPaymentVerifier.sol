// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPaymentVerifier {
    struct VerifyPaymentData {
        bytes32 intentHash;
        bytes paymentProof;
        bytes data;
    }

    struct PaymentVerificationResult {
        bool success;
        bytes32 intentHash;
        uint256 releaseAmount;
    }

    function verifyPayment(
        VerifyPaymentData calldata _data
    ) external returns (PaymentVerificationResult memory);
}
