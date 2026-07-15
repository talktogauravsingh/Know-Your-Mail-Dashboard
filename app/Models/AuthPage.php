<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AuthPage extends Model
{
    use HasFactory;

    protected $table = 'auth_pages';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'status',
    ];

    public function pageActions(): HasMany
    {
        return $this->hasMany(AuthPageAction::class, 'page_id');
    }

    public function actions(): BelongsToMany
    {
        return $this->belongsToMany(AuthAction::class, 'auth_page_actions', 'page_id', 'action_id');
    }
}
