<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Campaign;
use App\Models\Conversion;

class CtaRedirect extends Model
{
    protected $fillable = [
        'uuid',
        'campaign_id',
        'organization_id',
        'email',
        'redirect_url',
        'destination_url',
        'conversion_point',
        'metadata',
        'user_agent',
        'ip_address',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class, 'cta_redirect_id');
    }
}
