<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Recipient;
use App\Models\User;

class SendLog extends Model
{
    protected $fillable = [
        'campaign_id',
        'recipient_id',
        'variant_id',
        'email',
        'ip_used',
        'status',
        'response',
        'opened_at',
        'clicked_at',
        'sent_at',
        'delivered_at',
        'clicks_count',
        'opens_count',
        'bounce_type',
        'bounce_count',
        'region',
        'last_activity_at',
        'tracking_data'
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'tracking_data' => 'array',
    ];

    /**
     * Scope for sendlogs visible to user hierarchy
     */
    public function scopeForUserHierarchy($query, User $user): void
    {
        $query->whereHas('recipient', function($q) use ($user) {
            $q->ForUserHierarchy($user);
        });
    }

    public function recipient()
    {
        return $this->belongsTo(Recipient::class);
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
