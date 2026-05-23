<?php

namespace App\Services\Payments\DTO;

final class VerifyPaymentInput
{
    public function __construct(
        public readonly string $provider,
        public readonly string $providerOrderId,
        public readonly string $providerPaymentId,
        public readonly ?string $providerSignature,
        public readonly string $idempotencyKey,
    ) {}
}
