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
        'attributes',
        'is_valid',
        'validation_reason'
    ];

    protected $casts = [
        'attributes' => 'array',
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

    /**
     * Scope for recipients visible to user hierarchy (subordinates or org)
     */
    public function scopeForUserHierarchy($query, \App\Models\User $user): void
    {
        $subIds = $user->getSubordinateIds();
        $query->where(function($q) use ($user, $subIds) {
            $q->whereIn('agent_id', $subIds)
              ->orWhere('organization_id', $user->organization_id);
        });
    }
}
