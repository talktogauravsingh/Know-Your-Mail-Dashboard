<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CampaignVariant extends Model
{
    protected $fillable = [
        'campaign_id',
        'template_id',
        'name',
        'subject',
        'body',
        'is_default',
        'priority',
        'cta_url',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'priority'   => 'integer',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function filterGroups()
    {
        return $this->hasMany(SegmentFilterGroup::class, 'variant_id')
                    ->orderBy('group_index');
    }

    public function assignments()
    {
        return $this->hasMany(RecipientSegmentAssignment::class, 'variant_id');
    }
}
