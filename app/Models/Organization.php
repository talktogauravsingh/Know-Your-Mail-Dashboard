<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Organization extends Model
{
    protected $fillable = [
        'name'
    ];

    public function subscription(): HasOne
    {
        return $this->hasOne(OrganizationSubscription::class);
    }

    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    // ADD THIS
    public function smtpConfigurations(): HasMany
    {
        return $this->hasMany(SmtpConfiguration::class);
    }
}