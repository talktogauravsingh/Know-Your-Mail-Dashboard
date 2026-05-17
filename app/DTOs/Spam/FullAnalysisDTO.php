<?php

namespace App\DTOs\Spam;

class FullAnalysisDTO
{
    public function __construct(
        public readonly string $rawEmail,
        public readonly string $senderDomain,
        public readonly array $headers = []
    ) {}

    public static function fromRequest(array $validated): self
    {
        return new self(
            rawEmail: $validated['raw_email'],
            senderDomain: $validated['sender_domain'],
            headers: $validated['headers'] ?? []
        );
    }
}
