<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    public const STATUS_ORDER_PENDING = 1;
    public const STATUS_ORDER_CREATED = 2;
    public const STATUS_AUTHORIZED = 3;
    public const STATUS_PAID = 4;
    public const STATUS_FAILED = 5;
    public const STATUS_VERIFICATION_FAILED = 6;

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
            'status' => 'integer',
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

    public static function statusLabels(): array
    {
        return [
            self::STATUS_ORDER_PENDING => 'order_pending',
            self::STATUS_ORDER_CREATED => 'order_created',
            self::STATUS_AUTHORIZED => 'authorized',
            self::STATUS_PAID => 'paid',
            self::STATUS_FAILED => 'failed',
            self::STATUS_VERIFICATION_FAILED => 'verification_failed',
        ];
    }

    public static function labelForStatus(int $status): string
    {
        return self::statusLabels()[$status] ?? 'unknown';
    }
}
