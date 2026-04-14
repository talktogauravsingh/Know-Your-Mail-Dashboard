<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Organization;

class SmtpConfiguration extends Model
{
    protected $fillable = [
        'organization_id',
        'provider',
        'host',
        'port',
        'username',
        'password',
        'encryption',
        'from_name',
        'from_address',
        'is_global'
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
