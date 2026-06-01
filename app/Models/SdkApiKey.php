<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SdkApiKey extends Model
{
    protected $table = 'sdk_api_keys';

    protected $fillable = [
        'organization_id',
        'name',
        'key_hash',
        'key_prefix',
        'expires_at',
        'last_used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_used_at' => 'datetime',
    ];

    protected $hidden = ['key_hash'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public static function generateKey()
    {
        $key = 'sk_' . Str::random(32);
        return [
            'key' => $key,
            'hash' => hash('sha256', $key),
            'prefix' => substr($key, 0, 10),
        ];
    }

    public static function findByKeyHash($hash)
    {
        return self::where('key_hash', hash('sha256', $hash))
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->first();
    }

    public function isExpired()
    {
        return $this->expires_at && now()->isAfter($this->expires_at);
    }
}
