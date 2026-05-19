<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'idempotency_key',
        'provider',
        'provider_order_id',
        'provider_payment_id',
        'currency',
        'amount_minor',
        'client_reference_id',
        'status',
        'expires_at',
        'request_payload',
        'verification_payload',
        'provider_metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'expires_at' => 'datetime',
            'request_payload' => 'array',
            'verification_payload' => 'array',
            'provider_metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
