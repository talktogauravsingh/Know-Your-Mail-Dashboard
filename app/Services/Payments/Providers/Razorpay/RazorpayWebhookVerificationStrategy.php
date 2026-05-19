<?php

namespace App\Services\Payments\Providers\Razorpay;

use App\Services\Payments\Contracts\WebhookVerificationStrategy;
use App\Services\Payments\Exceptions\SignatureVerificationException;

final class RazorpayWebhookVerificationStrategy implements WebhookVerificationStrategy
{
    public function __construct(
        private readonly string $webhookSecret,
    ) {}

    /**
     * Razorpay Standard Checkout uses signature header: X-Razorpay-Signature
     * and webhook verification is HMAC SHA256 over the raw payload.
     */
    public function validate(array $payload, ?string $receivedSignature): bool
    {
        if (empty($receivedSignature)) {
            return false;
        }

        $rawPayload = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($rawPayload)) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawPayload, $this->webhookSecret);

        // Constant-time compare to reduce timing attack surface.
        return hash_equals($expected, $receivedSignature);
    }
}
