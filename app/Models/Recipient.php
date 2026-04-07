<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recipient extends Model
{
    protected $fillable = [
        'campaign_id',
        'organization_id',
        'agent_id',
        'email',
        'name',
        'phone',
        'additional_detail',
        'is_valid',
        'validation_reason'
    ];

    protected $casts = [
        'additional_detail' => 'array',
    ];

    public function scopeForAgent($query, $agentId)
    {
        return $query->where('agent_id', $agentId);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
