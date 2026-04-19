<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SegmentFilter extends Model
{
    protected $fillable = [
        'filter_group_id',
        'field_name',   // fully dynamic — whatever column came from the CSV
        'operator',
        'field_value',
    ];

    public function group()
    {
        return $this->belongsTo(SegmentFilterGroup::class, 'filter_group_id');
    }
}
