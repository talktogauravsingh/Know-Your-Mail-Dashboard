<?php

namespace Database\Factories;

use App\Models\SendLog;
use App\Models\Campaign;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class SendLogFactory extends Factory
{
    protected $model = SendLog::class;

    public function definition(): array
    {
        $sentAt = $this->faker->dateTimeBetween('-7 days');
        $status = $this->faker->randomElement(['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']);
        
        return [
            'campaign_id' => Campaign::factory(),
            'email' => $this->faker->safeEmail,
            'status' => $status,
            'sent_at' => $sentAt,
            'delivered_at' => $status === 'delivered' ? $sentAt->copy()->addSeconds(30) : null,
            'opened_at' => in_array($status, ['opened', 'clicked']) ? $sentAt->copy()->addMinutes(rand(1,60)) : null,
            'clicks_count' => $status === 'clicked' ? rand(1,5) : 0,
            'region' => $this->faker->countryCode,
            'bounce_type' => $status === 'bounced' ? $this->faker->randomElement(['hard', 'soft']) : null,
            'ip_used' => $this->faker->ipv4,
            'tracking_data' => json_encode(['browser' => $this->faker->randomElement(['Chrome', 'Firefox', 'Safari']), 'device' => $this->faker->randomElement(['Desktop', 'Mobile'])]),
        ];
    }
}

