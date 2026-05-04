<?php

namespace Database\Factories;

use App\Models\Suppression;
use Illuminate\Database\Eloquent\Factories\Factory;

class SuppressionFactory extends Factory
{
    protected $model = Suppression::class;

    public function definition(): array
    {
        return [
            'email' => $this->faker->safeEmail,
            'reason' => $this->faker->randomElement(['complaint', 'bounce', 'unsubscribe', 'manual']),
            'created_at' => $this->faker->dateTimeThisMonth(),
        ];
    }
}

