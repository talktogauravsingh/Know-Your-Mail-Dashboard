<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Campaign;
use App\Models\User;

class Conversion extends Model
{
    protected $fillable = [
        'campaign_id',
        'email',
        'event_type',
        'value',
        'currency',
        'event_time',
        'metadata',
        'cta_redirect_id',
        'event_id',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'event_time' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Scope for conversions visible to user hierarchy
     */
    public function scopeForUserHierarchy($query, User $user): void
    {
        $query->whereHas('campaign', function($q) use ($user) {
            $q->where('organization_id', $user->organization_id);
        });
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function ctaRedirect()
    {
        return $this->belongsTo(CtaRedirect::class, 'cta_redirect_id');
    }
}

