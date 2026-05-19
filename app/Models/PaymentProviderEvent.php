<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProviderEvent extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'provider',
        'event_type',
        'provider_event_id',
        'provider_order_id',
        'provider_payment_id',
        'provider_signature',
        'payload',
        'status',
        'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
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
