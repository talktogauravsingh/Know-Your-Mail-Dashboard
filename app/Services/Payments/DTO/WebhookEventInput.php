<?php

namespace App\Services\Payments\DTO;

final class WebhookEventInput
{
    /**
     * @param array<string,mixed> $payload The raw webhook payload parsed as array
     * @param string|null $razorpaySignature The signature header received from Razorpay (provider-specific)
     */
    public function __construct(
        public readonly string $provider,
        public readonly array $payload,
        public readonly ?string $providerSignature,
        public readonly string $idempotencyKey, // derived from provider event id (and provider)
    ) {}
}
