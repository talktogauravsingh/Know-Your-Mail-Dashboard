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
        'spf_verified',
        'dkim_verified',
        'dmarc_verified',
        'verified_at',
    ];

    protected $casts = [
        'spf_verified'   => 'boolean',
        'dkim_verified'  => 'boolean',
        'dmarc_verified' => 'boolean',
        'verified_at'    => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Whether all three DNS records have been verified.
     */
    public function isFullyVerified(): bool
    {
        return $this->spf_verified && $this->dkim_verified && $this->dmarc_verified;
    }

    /**
     * Build the list of DNS records the customer must add.
     */
    public function getDnsRecords(): array
    {
        $appHost = config('app.tracking_domain', parse_url(config('app.url'), PHP_URL_HOST));

        return [
            [
                'type'  => 'CNAME',
                'host'  => 'em.' . $this->domain,
                'value' => $appHost,
                'label' => 'Tracking Domain (Open & Click)',
                'verified' => $this->cname_target !== null,
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
