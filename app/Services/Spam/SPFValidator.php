<?php

namespace App\Services\Spam;

class SPFValidator
{
    public function check(string $domain, string $rawEmail): string
    {
        // Mock implementation
        // A real implementation would parse Received-SPF headers or query DNS TXT records.
        return 'pass'; 
    }
}
