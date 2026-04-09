<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed RBAC first (roles, permissions, attachments)
        $this->call(RbacSeeder::class);

        // Create test organization
        $organization = Organization::firstOrCreate(
            ['name' => 'Test Organization'],
            ['name' => 'Test Organization']
        );

        // Get manager role (created by RbacSeeder)
        $managerRole = Role::where('slug', 'manager')->first();

        // Create test manager user (required by all tests)
        $managerEmail = 'manager@example.com';
        User::firstOrCreate(
            ['email' => $managerEmail],
            [
                'name' => 'Test Manager',
                'email' => $managerEmail,
                'password' => Hash::make('password'),
                'role_id' => $managerRole?->id,
                'organization_id' => $organization->id,
            ]
        );

        // Create test agent user
        $agentEmail = 'agent@example.com';
        User::firstOrCreate(
            ['email' => $agentEmail],
            [
                'name' => 'Test Agent',
                'email' => $agentEmail,
                'password' => Hash::make('password'),
                'role_id' => Role::where('slug', 'user')->first()?->id, // Use 'user' role for agent
                'organization_id' => $organization->id,
            ]
        );

        // Create test regular user
        $userEmail = 'test@example.com';
        User::firstOrCreate(
            ['email' => $userEmail],
            [
                'name' => 'Test User',
                'email' => $userEmail,
                'password' => Hash::make('password'),
                'role_id' => Role::where('slug', 'user')->first()?->id,
                'organization_id' => $organization->id,
            ]
        );
    }
}

