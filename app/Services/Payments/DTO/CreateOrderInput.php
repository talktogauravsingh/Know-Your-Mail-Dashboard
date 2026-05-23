<?php

namespace App\Services\Payments\DTO;

final class CreateOrderInput
{
    public function __construct(
        public readonly int $organizationId,
        public readonly int $userId,
        public readonly string $provider,
        public readonly string $idempotencyKey,
        public readonly string $currency,
        public readonly int $amountMinor, // smallest unit
        public readonly ?string $clientReferenceId,
        public readonly array $customerMetadata, // non-sensitive metadata from backend
        public readonly array $orderNotes = [],
    ) {}
}
