<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Plan extends Model
{
    protected $fillable = [
        'key',
        'name',
        'description',
        'is_active',
        'price_minor',
        'currency',
        'billing_interval',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'integer',
            'price_minor' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot('is_enabled', 'limit_value')
            ->withTimestamps();
    }
}
