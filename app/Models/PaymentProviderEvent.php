<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProviderEvent extends Model
{
    public const STATUS_RECEIVED = 1;
    public const STATUS_PROCESSING = 2;
    public const STATUS_PROCESSED = 3;
    public const STATUS_FAILED = 4;
    public const STATUS_IGNORED = 5;

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
            'status' => 'integer',
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

    public static function statusLabels(): array
    {
        return [
            self::STATUS_RECEIVED => 'received',
            self::STATUS_PROCESSING => 'processing',
            self::STATUS_PROCESSED => 'processed',
            self::STATUS_FAILED => 'failed',
            self::STATUS_IGNORED => 'ignored',
        ];
    }

    public static function labelForStatus(int $status): string
    {
        return self::statusLabels()[$status] ?? 'unknown';
    }
}
