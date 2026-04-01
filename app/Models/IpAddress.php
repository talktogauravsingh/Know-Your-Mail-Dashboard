<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpAddress extends Model
{
    //
    protected $fillable = [
        'ip',
        'smtp_host',
        'smtp_username',
        'smtp_password',
        'smtp_port',
        'send_count',
        'success_count',
        'bounce_count',
        'complaint_count',
        'is_active',
        'warmup_start_at',
        'daily_limit',
        'allowed_domains'
    ];
}
