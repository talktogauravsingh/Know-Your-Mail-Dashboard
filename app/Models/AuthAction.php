<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuthAction extends Model
{
    use HasFactory;

    protected $table = 'auth_actions';

    public $timestamps = false;

    protected $fillable = [
        'name',
    ];

    public function pageActions(): HasMany
    {
        return $this->hasMany(AuthPageAction::class, 'action_id');
    }
}
