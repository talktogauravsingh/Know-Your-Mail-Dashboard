<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Organization;
use App\Models\Recipient;
use App\Models\User;
use Faker\Generator as Faker;
use Illuminate\Database\Seeder;

class RecipientSeeder extends Seeder
{
    public function run(): void
    {
        /** @var Faker $faker */
        $faker = app('Faker\Generator');

        $organizations = Organization::all();
        $campaigns = Campaign::all();

        foreach ($organizations as $org) {
            // Agents are users with role slug = 'user'
            $agents = User::where('organization_id', $org->id)
                ->whereHas('role', function ($q) {
                    $q->where('slug', 'user');
                })
                ->get();

            foreach ($agents as $agent) {
                // Create 100-200 recipients per agent (organization pool)
                $count = rand(100, 200);
                $now = now();

                $rows = [];
                for ($i = 0; $i < $count; $i++) {
                    $rows[] = [
                        'organization_id' => $org->id,
                        'agent_id' => $agent->id,
                        'campaign_id' => null,

                        // AssignSegmentsJob expects:
                        // - organization recipients: module_type=1, module_id=organization_id
                        'module_type' => 1,
                        'module_id' => $org->id,

                        'email' => $faker->unique()->safeEmail,
                        'name' => $faker->name,
                        'phone' => $faker->phoneNumber,

                        // Must contain fields used by segment_filters (CampaignSeeder seeds field_name = 'city')
                        // AssignSegmentsJob compares lowercased JSON_UNQUOTE(JSON_EXTRACT(attributes, ...)).
                        'attributes' => json_encode([
                            'city' => $faker->city,
                            'interest' => $faker->word,
                        ]),

                        'is_valid' => true,
                        'validation_reason' => null,

                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                Recipient::insert($rows);

                // Assign some recipients to a specific campaign (campaign pool)
                if ($campaigns->isNotEmpty()) {
                    $campaign = $campaigns->random();

                    $campaignRows = [];
                    $campaignCount = 20;
                    $now2 = now();

                    for ($i = 0; $i < $campaignCount; $i++) {
                        $campaignRows[] = [
                            'organization_id' => $org->id,
                            'agent_id' => $agent->id,
                            'campaign_id' => $campaign->id,

                            // AssignSegmentsJob expects:
                            // - campaign recipients: module_type=2, module_id=campaign_id
                            'module_type' => 2,
                            'module_id' => $campaign->id,

                            'email' => $faker->unique()->safeEmail,
                            'name' => $faker->name,
                            'phone' => $faker->phoneNumber,

                            'attributes' => json_encode([
                                'city' => $faker->city,
                                'interest' => $faker->word,
                            ]),

                            'is_valid' => true,
                            'validation_reason' => null,

                            'created_at' => $now2,
                            'updated_at' => $now2,
                        ];
                    }

                    Recipient::insert($campaignRows);
                }
            }
        }

        // Add some invalid recipients for testing (organization pool)
        $defaultOrgId = $organizations->first()?->id;

        if (!empty($defaultOrgId)) {
            $invalidRows = [];
            $now = now();

            for ($i = 0; $i < 50; $i++) {
                $invalidRows[] = [
                    'organization_id' => $defaultOrgId,
                    'agent_id' => User::where('organization_id', $defaultOrgId)
                        ->whereHas('role', function ($q) {
                            $q->where('slug', 'user');
                        })
                        ->value('id'),

                    'campaign_id' => null,

                    'module_type' => 1,
                    'module_id' => $defaultOrgId,

                    'email' => $faker->unique()->email,
                    'name' => $faker->name,
                    'phone' => $faker->phoneNumber,

                    'attributes' => json_encode([
                        'city' => $faker->city,
                        'interest' => $faker->word,
                    ]),

                    'is_valid' => false,
                    'validation_reason' => 'Invalid domain',

                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Filter out any rows where agent_id could not be found
            $invalidRows = array_values(array_filter($invalidRows, fn ($r) => !empty($r['agent_id'])));

            if (!empty($invalidRows)) {
                Recipient::insert($invalidRows);
            }
        }
    }
}

