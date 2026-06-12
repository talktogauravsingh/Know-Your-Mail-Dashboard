<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmtpCredential extends Model
{
    protected $fillable = [
        'organization_id',
        'username',
        'password_hash',
        'domain_id',
        'is_active',
        'rate_limit_per_hour',
        'encrypted_password',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'rate_limit_per_hour' => 'integer',
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
