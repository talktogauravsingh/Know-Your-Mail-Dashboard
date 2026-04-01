<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recipient extends Model
{
    //
    protected $fillable = [
        'campaign_id',
        'email',
        'is_valid',
        'validation_reason'
    ];
}
