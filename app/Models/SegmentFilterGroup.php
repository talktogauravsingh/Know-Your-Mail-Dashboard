<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SegmentFilterGroup extends Model
{
    protected $fillable = ['variant_id', 'group_index'];

    public function variant()
    {
        return $this->belongsTo(CampaignVariant::class, 'variant_id');
    }

    public function filters()
    {
        return $this->hasMany(SegmentFilter::class, 'filter_group_id');
    }
}
