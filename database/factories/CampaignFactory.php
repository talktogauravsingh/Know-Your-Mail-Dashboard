<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\Organization;
use App\Models\SmtpConfiguration;
use Illuminate\Database\Eloquent\Factories\Factory;

class CampaignFactory extends Factory
{
    protected $model = Campaign::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => $this->faker->words(3, true),
            'subject' => $this->faker->sentence(4),
            'body' => '<h1>' . $this->faker->words(3, true) . '</h1><p>' . $this->faker->paragraph . '</p>',
            'status' => $this->faker->randomElement(['draft', 'scheduled', 'running', 'completed', 'paused']),
            'segmentation_mode' => 'single',
            'sender_config_id' => SmtpConfiguration::factory(),
            'cta_url' => $this->faker->url,
            'variants' => [],
        ];
    }
}

