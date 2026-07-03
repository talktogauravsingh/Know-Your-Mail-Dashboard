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

        // Get roles
        $superAdminRole = Role::where('slug', 'super-admin')->first();
        $managerRole = Role::where('slug', 'manager')->first();
        $userRole = Role::where('slug', 'user')->first();

        // Create super admin user
        $superAdminEmail = 'superadmin@example.com';
        User::firstOrCreate(
            ['email' => $superAdminEmail],
            [
                'name' => 'Super Admin',
                'email' => $superAdminEmail,
                'password' => Hash::make('password'),
                'role_id' => $superAdminRole?->id,
                'organization_id' => $organization->id,
            ]
        );

        // Create test manager user
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
                'role_id' => $userRole?->id,
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
                'role_id' => $superAdminRole?->id,
                'organization_id' => $organization->id,
            ]
        );

        $this->call([
            OrganizationSeeder::class,
            UserSeeder::class,
            CampaignSeeder::class,
            RecipientSeeder::class,
            // TrackingSeeder::class,
            // DummyDataSeeder::class,
        ]);
    }
}
