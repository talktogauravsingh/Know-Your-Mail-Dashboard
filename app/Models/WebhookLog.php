<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebhookLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'webhook_id',
        'event_id',
        'payload',
        'response_status',
        'response_body',
        'duration_ms',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function webhook()
    {
        return $this->belongsTo(Webhook::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
