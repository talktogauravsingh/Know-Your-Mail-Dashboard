<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrackingSession extends Model
{
    protected $fillable = [
        'session_id',
        'cta_redirect_id',
        'tracking_token',
        'device_fingerprint',
        'clicked_at',
        'expires_at',
        'attribution_window_days',
    ];

    protected $casts = [
        'clicked_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function ctaRedirect()
    {
        return $this->belongsTo(CtaRedirect::class);
    }

    public function isExpired()
    {
        return now()->isAfter($this->expires_at);
    }

    public static function findValidByToken($token)
    {
        return self::where('tracking_token', $token)
            ->where('expires_at', '>', now())
            ->first();
    }
}
