<?php

namespace Database\Seeders;

use App\Models\Recipient;
use App\Models\Organization;
use App\Models\User;
use App\Models\Campaign;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class RecipientSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = Organization::with('users')->get();
        $campaigns = Campaign::all();

        foreach ($organizations as $org) {
            $agents = $org->users()->whereHas('role', function($q) {
                $q->where('slug', 'user'); // agents
            })->get();

            foreach ($agents as $agent) {
                // Create 100-200 recipients per agent
                $count = rand(100, 200);
                Recipient::factory($count)->create([
                    'organization_id' => $org->id,
                    'agent_id' => $agent->id,
                ]);

                // Assign some to campaigns
                if ($campaigns->count() > 0) {
                    $campaign = $campaigns->random();
                    Recipient::factory(20)->create([
                        'organization_id' => $org->id,
                        'agent_id' => $agent->id,
                        'campaign_id' => $campaign->id,
                    ]);
                }
            }
        }

        // Add some invalid recipients for testing
        Recipient::factory(50)->create([
            'is_valid' => false,
            'validation_reason' => 'Invalid domain',
        ]);
    }
}

