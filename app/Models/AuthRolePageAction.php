<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthRolePageAction extends Model
{
    use HasFactory;

    protected $table = 'auth_role_page_actions';

    public $timestamps = false;

    protected $fillable = [
        'role_id',
        'page_action_id',
        'access',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(AuthRole::class, 'role_id');
    }

    public function pageAction(): BelongsTo
    {
        return $this->belongsTo(AuthPageAction::class, 'page_action_id');
    }

    public function pageActionPivot()
    {
        return $this->hasOne(AuthPageAction::class, 'id', 'page_action_id')->where('status', 1);
    }
}
