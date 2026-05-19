<?php

namespace App\Services\Payments\Providers\Razorpay;

use App\Services\Payments\Contracts\PaymentProviderInterface;
use App\Services\Payments\DTO\CreateOrderInput;
use App\Services\Payments\DTO\CreateOrderOutput;
use App\Services\Payments\DTO\VerifyPaymentInput;
use App\Services\Payments\DTO\VerifyPaymentOutput;

final class RazorpayProvider implements PaymentProviderInterface
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $apiSecret,
        private readonly RazorpayWebhookVerificationStrategy $webhookVerification,
    ) {}

    public function providerKey(): string
    {
        return 'razorpay';
    }

    public function createOrder(CreateOrderInput $input): CreateOrderOutput
    {
        // TODO: Implement using Razorpay Standard Checkout orders API
        // This method is intentionally left as production-safe scaffold: it must be implemented next.
        throw new \RuntimeException('RazorpayProvider::createOrder not implemented yet');
    }

    public function verifyPayment(VerifyPaymentInput $input): VerifyPaymentOutput
    {
        // TODO: Implement using Razorpay signature verification for payment + order
        throw new \RuntimeException('RazorpayProvider::verifyPayment not implemented yet');
    }

    public function validateWebhookSignature(array $payload, ?string $receivedSignature): bool
    {
        return $this->webhookVerification->validate($payload, $receivedSignature);
    }
}
