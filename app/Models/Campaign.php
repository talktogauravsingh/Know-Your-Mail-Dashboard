<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\SendLog;
use App\Models\Conversion;

class Campaign extends Model
{

    protected $fillable = [
        'organization_id',
        'name',
        'subject',
        'body',
        'status',
        'segmentation_mode', // 'single' or 'segmented'
        'sender_config_id',
        'cta_url',
        'variants',
        'schedule_type',
        'scheduled_at',
        'schedule_frequency',
        'schedule_days',
        'schedule_time',
    ];

    protected $casts = [
        'variants' => 'array',
        'schedule_days' => 'array',
        'scheduled_at' => 'datetime',
    ];

    public function variants()
    {
        return $this->hasMany(CampaignVariant::class);
    }

    public function assignments()
    {
        return $this->hasMany(RecipientSegmentAssignment::class);
    }

    /**
     * Scope for campaigns visible to user (org level)
     */
    public function scopeForUser($query, User $user): void
    {
        $query->where('organization_id', $user->organization_id);
    }

    public function sendLogs()
    {
        return $this->hasMany(SendLog::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }
}
