<?php

namespace Database\Factories;

use App\Models\Conversion;
use App\Models\Campaign;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConversionFactory extends Factory
{
    protected $model = Conversion::class;

    public function definition(): array
    {
        return [
            'campaign_id' => Campaign::factory(),
            'email' => $this->faker->safeEmail,
            'conversion_type' => $this->faker->randomElement(['purchase', 'signup', 'download']),
            'value' => $this->faker->randomFloat(2, 0, 1000),
            'occurred_at' => $this->faker->dateTimeBetween('-7 days'),
            'ip_address' => $this->faker->ipv4,
            'user_agent' => $this->faker->userAgent,
        ];
    }
}

