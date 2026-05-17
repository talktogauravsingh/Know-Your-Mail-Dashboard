<?php

namespace App\Services\Spam;

class DKIMValidator
{
    public function check(string $rawEmail): string
    {
        // Mock implementation
        // A real system would use a package to verify the DKIM signature against DNS records.
        return 'pass';
    }
}
