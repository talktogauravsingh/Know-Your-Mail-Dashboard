<?php

namespace App\Services\Payments\DTO;

final class CreateOrderOutput
{
    public function __construct(
        public readonly string $providerOrderId,
        public readonly string $currency,
        public readonly int $amountMinor,
        public readonly array $providerRawResponse = [],
    ) {}
}
