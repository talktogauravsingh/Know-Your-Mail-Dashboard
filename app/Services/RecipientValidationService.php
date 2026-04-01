<?php
namespace App\Services;

class RecipientValidationService
{
    public function validate($email)
    {
        // 1. Syntax check
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [false, 'invalid_format'];
        }

        // 2. Domain check
        $domain = substr(strrchr($email, "@"), 1);

        if (!$this->hasMxRecord($domain)) {
            return [false, 'no_mx_record'];
        }

        // 3. Disposable check
        if ($this->isDisposable($domain)) {
            return [false, 'disposable_domain'];
        }

        return [true, null];
    }

    private function hasMxRecord($domain)
    {
        return checkdnsrr($domain, 'MX');
    }

    private function isDisposable($domain)
    {
        $blacklist = [
            'mailinator.com',
            'tempmail.com',
            '10minutemail.com'
        ];

        return in_array($domain, $blacklist);
    }
}