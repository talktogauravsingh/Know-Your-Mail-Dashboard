<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecipientSegmentAssignment extends Model
{
    protected $fillable = [
        'campaign_id',
        'recipient_id',
        'variant_id',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function recipient()
    {
        return $this->belongsTo(Recipient::class);
    }

    public function variant()
    {
        return $this->belongsTo(CampaignVariant::class, 'variant_id');
    }
}
