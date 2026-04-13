<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiLog extends Model
{
    //
    protected $fillable = [
        'user_id',
        'session_id',
        'role',
        'content'
    ];
}
