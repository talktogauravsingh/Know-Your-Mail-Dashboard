<?php

namespace App\Services\Payments\Contracts;

use App\Services\Payments\DTO\CreateOrderInput;
use App\Services\Payments\DTO\CreateOrderOutput;
use App\Services\Payments\DTO\VerifyPaymentInput;
use App\Services\Payments\DTO\VerifyPaymentOutput;

interface PaymentProviderInterface
{
    public function createOrder(CreateOrderInput $input): CreateOrderOutput;

    public function verifyPayment(VerifyPaymentInput $input): VerifyPaymentOutput;

    public function validateWebhookSignature(array $payload, ?string $receivedSignature): bool;

    /**
     * Human-readable provider name key used internally (e.g. razorpay_standard).
     */
    public function providerKey(): string;
}
