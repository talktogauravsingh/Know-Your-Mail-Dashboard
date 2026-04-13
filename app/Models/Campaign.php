<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\SendLog;
use App\Models\Conversion;

class Campaign extends Model
{

    protected $fillable = [
        'organization_id',
        'name',
        'subject',
        'body',
        'status'
    ];

    /**
     * Scope for campaigns visible to user (org level)
     */
    public function scopeForUser($query, User $user): void
    {
        $query->where('organization_id', $user->organization_id);
    }

    public function sendLogs()
    {
        return $this->hasMany(SendLog::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }
}
