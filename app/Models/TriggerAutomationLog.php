<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TriggerAutomationLog extends Model
{
    protected $table = 'trigger_automation_logs';

    protected $fillable = [
        'automation_id',
        'recipient_id',
        'send_log_id',
        'triggered_at',
        'status',
        'response',
    ];

    protected $casts = [
        'triggered_at' => 'datetime',
    ];

    public function automation(): BelongsTo
    {
        return $this->belongsTo(TriggerAutomation::class, 'automation_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(Recipient::class, 'recipient_id');
    }

    public function sendLog(): BelongsTo
    {
        return $this->belongsTo(SendLog::class, 'send_log_id');
    }
}
