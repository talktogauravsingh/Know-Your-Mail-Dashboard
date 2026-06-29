<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationFeatureCredit extends Model
{
    protected $fillable = [
        'organization_id',
        'feature_key',
        'credits_balance',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'credits_balance' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
