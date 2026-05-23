<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationSubscription extends Model
{
    public const STATUS_TRIAL = 1;
    public const STATUS_ACTIVE = 2;
    public const STATUS_PAST_DUE = 3;
    public const STATUS_CANCELLED = 4;
    public const STATUS_EXPIRED = 5;

    protected $fillable = [
        'organization_id',
        'plan_key',
        'status',
        'billing_interval',
        'amount_minor',
        'currency',
        'latest_payment_transaction_id',
        'started_at',
        'renews_at',
        'cancelled_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'status' => 'integer',
            'latest_payment_transaction_id' => 'integer',
            'started_at' => 'datetime',
            'renews_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function latestPaymentTransaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class, 'latest_payment_transaction_id');
    }

    public static function statusLabels(): array
    {
        return [
            self::STATUS_TRIAL => 'trial',
            self::STATUS_ACTIVE => 'active',
            self::STATUS_PAST_DUE => 'past_due',
            self::STATUS_CANCELLED => 'cancelled',
            self::STATUS_EXPIRED => 'expired',
        ];
    }

    public static function labelForStatus(int $status): string
    {
        return self::statusLabels()[$status] ?? 'unknown';
    }
}
