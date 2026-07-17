<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SenderDomain extends Model
{
    protected $fillable = [
        'organization_id',
        'domain',
        'status',
        'cname_target',
        'dkim_selector',
        'dkim_public_key',
        'dkim_private_key',
        'spf_verified',
        'dkim_verified',
        'dmarc_verified',
        'cname_verified',
        'verified_at',
    ];

    protected $casts = [
        'spf_verified'   => 'boolean',
        'dkim_verified'  => 'boolean',
        'dmarc_verified' => 'boolean',
        'cname_verified' => 'boolean',
        'verified_at'    => 'datetime',
    ];

    /**
     * Decrypt the DKIM private key using custom GCM decryption.
     */
    public function getDkimPrivateKeyAttribute($value)
    {
        if (!$value) return null;
        try {
            $key = env('ENCRYPTION_KEY', 'kym_encryption_secret_key_32_bytes_long_key_!');
            return self::decryptDkim($value, $key);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Encrypt the DKIM private key using custom GCM encryption.
     */
    public function setDkimPrivateKeyAttribute($value)
    {
        if (!$value) {
            $this->attributes['dkim_private_key'] = null;
            return;
        }
        $key = env('ENCRYPTION_KEY', 'kym_encryption_secret_key_32_bytes_long_key_!');
        $this->attributes['dkim_private_key'] = self::encryptDkim($value, $key);
    }

    public static function encryptDkim(string $text, string $encryptionKey): string
    {
        $keyBuffer = hash('sha256', $encryptionKey, true);
        $iv = openssl_random_pseudo_bytes(12);
        $encrypted = openssl_encrypt($text, 'aes-256-gcm', $keyBuffer, OPENSSL_RAW_DATA, $iv, $tag);
        return bin2hex($iv) . ':' . bin2hex($tag) . ':' . bin2hex($encrypted);
    }

    public static function decryptDkim(string $encryptedText, string $encryptionKey): string
    {
        $parts = explode(':', $encryptedText);
        if (count($parts) !== 3) {
            return '';
        }
        $iv = hex2bin($parts[0]);
        $tag = hex2bin($parts[1]);
        $encrypted = hex2bin($parts[2]);
        $keyBuffer = hash('sha256', $encryptionKey, true);
        return openssl_decrypt($encrypted, 'aes-256-gcm', $keyBuffer, OPENSSL_RAW_DATA, $iv, $tag);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Whether all DNS records have been verified.
     */
    public function isFullyVerified(): bool
    {
        return $this->spf_verified && $this->dkim_verified && $this->dmarc_verified && $this->cname_verified;
    }

    /**
     * Build the list of DNS records the customer must add.
     */
    public function getDnsRecords(): array
    {
        $appHost = config('app.tracking_domain') ?: parse_url(config('app.url'), PHP_URL_HOST);

        return [
            [
                'type'  => 'CNAME',
                'host'  => 'em.' . $this->domain,
                'value' => $appHost,
                'label' => 'Tracking Domain (Open & Click)',
                'verified' => $this->cname_verified,
            ],
            [
                'type'  => 'TXT',
                'host'  => $this->domain,
                'value' => 'v=spf1 include:' . $appHost . ' ~all',
                'label' => 'SPF Record',
                'verified' => $this->spf_verified,
            ],
            [
                'type'  => 'TXT',
                'host'  => ($this->dkim_selector ?? 'kym') . '._domainkey.' . $this->domain,
                'value' => 'v=DKIM1; k=rsa; p=' . ($this->dkim_public_key ?? ''),
                'label' => 'DKIM Record',
                'verified' => $this->dkim_verified,
            ],
            [
                'type'  => 'TXT',
                'host'  => '_dmarc.' . $this->domain,
                'value' => 'v=DMARC1; p=none; rua=mailto:dmarc@' . $appHost,
                'label' => 'DMARC Record',
                'verified' => $this->dmarc_verified,
            ],
        ];
    }
}
