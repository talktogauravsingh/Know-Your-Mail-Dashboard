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

public function bulkValidate(array $data)
{
    // Mandatory fields
    if (empty(trim($data['email'] ?? ''))) return [false, 'missing_email'];
    if (empty(trim($data['name'] ?? ''))) return [false, 'missing_name'];
    if (empty(trim($data['phone'] ?? ''))) return [false, 'missing_phone'];

    $email = trim($data['email']);

    // Reuse email validation
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return [false, 'invalid_email_format'];
    }

    $domain = substr(strrchr($email, "@"), 1);
    if (!$this->hasMxRecord($domain)) {
        return [false, 'email_no_mx_record'];
    }

    if ($this->isDisposable($domain)) {
        return [false, 'email_disposable_domain'];
    }

    // Basic phone check (digits + optional separators)
    $phone = preg_replace('/[^0-9]/', '', $data['phone']);
    if (strlen($phone) < 10) {
        return [false, 'invalid_phone'];
    }

    // Name basic check
    if (strlen(trim($data['name'])) < 2) {
        return [false, 'invalid_name'];
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