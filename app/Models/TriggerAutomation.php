<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TriggerAutomation extends Model
{
    protected $table = 'trigger_automations';

    protected $fillable = [
        'uuid',
        'organization_id',
        'name',
        'status',
        'trigger_campaign_id',
        'trigger_variant_ids',
        'trigger_event',
        'trigger_click_url',
        'action_template_id',
        'action_subject',
        'action_variable_mappings',
        'delay_hours',
        'delay_minutes',
    ];

    protected $casts = [
        'trigger_variant_ids' => 'array',
        'action_variable_mappings' => 'array',
        'delay_hours' => 'integer',
        'delay_minutes' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($automation) {
            $automation->uuid = Str::uuid()->toString();
        });
    }

    /**
     * Scope for automations visible to user (org level)
     */
    public function scopeForUser($query, User $user): void
    {
        $query->where('organization_id', $user->organization_id);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'trigger_campaign_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(EmailTemplate::class, 'action_template_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(TriggerAutomationLog::class, 'automation_id');
    }
}
