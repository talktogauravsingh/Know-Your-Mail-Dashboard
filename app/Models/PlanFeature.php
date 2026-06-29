<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class PlanFeature extends Pivot
{
    protected $table = 'plan_features';

    protected $fillable = [
        'plan_id',
        'feature_id',
        'is_enabled',
        'limit_value',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'integer',
            'limit_value' => 'integer',
        ];
    }
}
