<?php

namespace App\Services\Payments\DTO;

final class IdempotencyKeyFactory
{
    /**
     * Deterministic idempotency key scoped by provider + event id.
     * Used to dedupe provider webhooks and avoid replay processing.
     */
    public static function fromProviderEvent(string $provider, string $providerEventId): string
    {
        // Keep it short but deterministic; providerEventId is already unique.
        return hash('sha256', $provider . ':' . $providerEventId);
    }

    /**
     * Deterministic idempotency key scoped by provider + payment/order ids if available.
     */
    public static function fromProviderPayment(string $provider, string $providerPaymentId): string
    {
        return hash('sha256', $provider . ':payment:' . $providerPaymentId);
    }
}
