<?php

namespace Database\Factories;

use App\Models\AiLog;
use Illuminate\Database\Eloquent\Factories\Factory;

class AiLogFactory extends Factory
{
    protected $model = AiLog::class;

    public function definition(): array
    {
        return [
            'prompt' => $this->faker->sentence(10),
            'response' => $this->faker->paragraphs(2, true),
            'model' => $this->faker->randomElement(['gpt-4', 'gpt-3.5-turbo']),
            'tokens_used' => $this->faker->numberBetween(100, 2000),
            'cost' => $this->faker->randomFloat(4, 0.001, 0.1),
            'user_id' => null,
            'created_at' => $this->faker->dateTimeThisMonth(),
        ];
    }
}

