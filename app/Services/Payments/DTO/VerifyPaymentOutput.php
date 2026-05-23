<?php

namespace App\Services\Payments\DTO;

final class VerifyPaymentOutput
{
    public function __construct(
        public readonly string $providerOrderId,
        public readonly string $providerPaymentId,
        public readonly bool $isVerified,
        public readonly array $providerRawResponse = [],
    ) {}
}
