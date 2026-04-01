<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Suppression extends Model
{
    //
    protected $fillable = [
        'organization_id',
        'email',
        'reason'
    ];
}
