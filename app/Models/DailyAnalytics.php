<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyAnalytics extends Model
{
    protected $table = 'daily_analytics';

    protected $fillable = [
        'organization_id',
        'domain_id',
        'date',
        'sent_count',
        'delivered_count',
        'bounce_count',
        'complaint_count',
        'open_count',
        'real_open_count',
        'click_count',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function domain()
    {
        return $this->belongsTo(SenderDomain::class, 'domain_id');
    }
}
