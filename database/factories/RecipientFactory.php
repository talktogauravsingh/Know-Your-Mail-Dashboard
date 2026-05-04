<?php

namespace Database\Factories;

use App\Models\Recipient;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class RecipientFactory extends Factory
{
    protected $model = Recipient::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'agent_id' => User::factory(),
            'email' => $this->faker->unique()->safeEmail,
            'name' => $this->faker->name,
            'phone' => $this->faker->phoneNumber,
            'attributes' => ['city' => $this->faker->city, 'interest' => $this->faker->word],
            'is_valid' => true,
            'validation_reason' => null,
            'campaign_id' => null,
        ];
    }
}

