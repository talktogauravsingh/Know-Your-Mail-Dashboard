<?php

namespace Database\Factories;

use App\Models\SmtpConfiguration;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class SmtpConfigurationFactory extends Factory
{
    protected $model = SmtpConfiguration::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'provider' => $this->faker->randomElement(['AWS SES', 'SendGrid', 'Mailgun', 'SMTP']),
            'host' => $this->faker->domainName,
            'port' => $this->faker->numberBetween(25, 587),
            'username' => $this->faker->userName . '@example.com',
            'password' => 'testpass123',
            'from_name' => $this->faker->company,
            'from_address' => $this->faker->safeEmail,
            'is_global' => false,
        ];
    }
}

