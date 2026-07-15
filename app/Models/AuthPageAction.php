<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuthPageAction extends Model
{
    use HasFactory;

    protected $table = 'auth_page_actions';

    public $timestamps = false;

    protected $fillable = [
        'page_id',
        'action_id',
        'description',
        'status',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(AuthPage::class, 'page_id');
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(AuthAction::class, 'action_id');
    }

    public function rolePageActions(): HasMany
    {
        return $this->hasMany(AuthRolePageAction::class, 'page_action_id');
    }
}
