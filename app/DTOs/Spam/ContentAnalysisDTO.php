<?php

namespace App\DTOs\Spam;

class ContentAnalysisDTO
{
    public function __construct(
        public readonly string $content,
        public readonly ?string $subject = null
    ) {}

    public static function fromRequest(array $validated): self
    {
        return new self(
            content: $validated['content'],
            subject: $validated['subject'] ?? null
        );
    }
}
