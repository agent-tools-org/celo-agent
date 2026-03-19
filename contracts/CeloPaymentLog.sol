// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CeloPaymentLog
/// @notice On-chain payment log for Celo payment agent
contract CeloPaymentLog {
    struct Payment {
        address sender;
        address recipient;
        uint256 amount;
        string currency;
        string memo;
        uint256 timestamp;
    }

    Payment[] private payments;

    event PaymentLogged(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string currency,
        string memo,
        uint256 timestamp
    );

    /// @notice Log a payment on-chain
    /// @param recipient The payment recipient address
    /// @param amount The payment amount
    /// @param currency The currency symbol (e.g. "cUSD")
    /// @param memo A human-readable memo
    function logPayment(
        address recipient,
        uint256 amount,
        string calldata currency,
        string calldata memo
    ) external {
        payments.push(Payment({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            currency: currency,
            memo: memo,
            timestamp: block.timestamp
        }));

        emit PaymentLogged(
            msg.sender,
            recipient,
            amount,
            currency,
            memo,
            block.timestamp
        );
    }

    /// @notice Get total number of logged payments
    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    /// @notice Get a payment by index
    /// @param index The payment index
    function getPayment(uint256 index)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 amount,
            string memory currency,
            string memory memo,
            uint256 timestamp
        )
    {
        require(index < payments.length, "Index out of bounds");
        Payment storage p = payments[index];
        return (p.sender, p.recipient, p.amount, p.currency, p.memo, p.timestamp);
    }
}
