<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganizationType extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
    ];

    public function organizations(): HasMany
    {
        return $this->hasMany(Organization::class, 'org_type');
    }
}
