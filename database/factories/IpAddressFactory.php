<?php

namespace Database\Factories;

use App\Models\IpAddress;
use Illuminate\Database\Eloquent\Factories\Factory;

class IpAddressFactory extends Factory
{
    protected $model = IpAddress::class;

    public function definition(): array
    {
        return [
            'ip' => $this->faker->ipv4,
            'location' => $this->faker->city . ', ' . $this->faker->country,
            'last_used_at' => $this->faker->dateTimeThisYear,
        ];
    }
}

