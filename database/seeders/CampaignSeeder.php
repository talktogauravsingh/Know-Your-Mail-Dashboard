<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignVariant;
use App\Models\SegmentFilter;
use App\Models\SegmentFilterGroup;
use App\Models\SmtpConfiguration;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Faker\Generator as Faker;

class CampaignSeeder extends Seeder
{
    protected Faker $faker;

    public function __construct(Faker $faker)
    {
        $this->faker = $faker;
    }

    public function run(): void
    {
        $organizations = Organization::with('smtpConfigurations')->get();

        foreach ($organizations as $org) {
            $smtpConfig = $org->smtpConfigurations->first();

            for ($i = 1; $i <= 5; $i++) {
                $segmentationMode = $this->faker->randomElement(['single', 'segmented']);
                $campaign = Campaign::create([
                    'organization_id' => $org->id,
                    'name' => "Campaign #{$i} - " . ucfirst($this->faker->words(3, true)),
                    'subject' => $this->faker->sentence(4),
                    'body' => '<h1>' . $this->faker->words(3, true) . '</h1><p>' . $this->faker->paragraphs(3, true) . '</p><a href="' . $this->faker->url . '">Click here</a>',
                    'status' => $this->faker->randomElement(['draft', 'scheduled', 'running', 'completed']),
                    'segmentation_mode' => $segmentationMode,
                    'sender_config_id' => $smtpConfig?->id,
                    'cta_url' => $this->faker->url,
                ]);

                $defaultVariant = CampaignVariant::create([
                    'campaign_id' => $campaign->id,
                    'name' => 'Default Variant',
                    'subject' => $campaign->subject,
                    'body' => $campaign->body,
                    'is_default' => true,
                    'priority' => 1,
                    'cta_url' => $campaign->cta_url,
                ]);

                if ($segmentationMode === 'segmented') {
                    $variantCount = rand(1, 2);

                    for ($v = 1; $v <= $variantCount; $v++) {
                        $variant = CampaignVariant::create([
                            'campaign_id' => $campaign->id,
                            'name' => "Segment Variant {$v}",
                            'subject' => $campaign->subject . " (V{$v})",
                            'body' => $campaign->body . "<p>Variant {$v} content</p>",
                            'is_default' => false,
                            'priority' => $v + 1,
                            'cta_url' => $this->faker->url,
                        ]);

                        $filterGroup = SegmentFilterGroup::create([
                            'variant_id' => $variant->id,
                            'group_index' => 0,
                        ]);

                        SegmentFilter::create([
                            'filter_group_id' => $filterGroup->id,
                            'field_name' => 'city',
                            'operator' => 'contains',
                            'field_value' => $this->faker->city,
                        ]);
                    }
                } else {
                    $filterGroup = SegmentFilterGroup::create([
                        'variant_id' => $defaultVariant->id,
                        'group_index' => 0,
                    ]);

                    SegmentFilter::create([
                        'filter_group_id' => $filterGroup->id,
                        'field_name' => 'city',
                        'operator' => 'contains',
                        'field_value' => $this->faker->city,
                    ]);
                }
            }
        }
    }
}
