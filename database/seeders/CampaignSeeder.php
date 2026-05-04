<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignVariant;
use App\Models\SegmentFilterGroup;
use App\Models\SegmentFilter;
use App\Models\Organization;
use App\Models\SmtpConfiguration;
use Illuminate\Database\Seeder;

use Faker\Generator as Faker;
class CampaignSeeder extends Seeder
{
    protected $faker;

    public function __construct(Faker $faker)
    {
        $this->faker = $faker;
    }

    public function run(): void
    {
        $organizations = Organization::with('smtpConfigurations')->get();

        foreach ($organizations as $org) {
            $smtpConfig = $org->smtpConfigurations->first();

            // Create 5 campaigns per org
            for ($i = 1; $i <= 5; $i++) {
                $campaign = Campaign::create([
                    'organization_id' => $org->id,
                    'name' => "Campaign #{$i} - " . ucfirst($this->faker->words(3, true)),
                    'subject' => $this->faker->sentence(4),
                    'body' => '<h1>' . $this->faker->words(3, true) . '</h1><p>' . $this->faker->paragraphs(3, true) . '</p><a href="' . $this->faker->url . '">Click here</a>',
                    'status' => $this->faker->randomElement(['draft', 'scheduled', 'running', 'completed']),
                    'segmentation_mode' => $this->faker->randomElement(['single', 'segmented']),
                    'sender_config_id' => $smtpConfig?->id,
                    'cta_url' => $this->faker->url,
                ]);

                // Create 1-2 variants for segmented campaigns
                if ($campaign->segmentation_mode === 'segmented') {
                    for ($v = 1; $v <= rand(1,2); $v++) {
                        CampaignVariant::create([
                            'campaign_id' => $campaign->id,
                            'name' => "Variant {$v}",
                            'subject' => $campaign->subject . " (V{$v})",
                            'body' => $campaign->body . "<p>Variant {$v} content</p>",
                            'send_percentage' => 50,
                        ]);
                    }
                }

                // Create simple segment filter group
                $filterGroup = SegmentFilterGroup::create([
                    'campaign_id' => $campaign->id,
                    'name' => 'Default Segment',
                ]);

                SegmentFilter::create([
                    'segment_filter_group_id' => $filterGroup->id,
                    'field' => 'attributes.city',
                    'operator' => 'contains',
                    'value' => $this->faker->city,
                ]);
            }
        }
    }
}

