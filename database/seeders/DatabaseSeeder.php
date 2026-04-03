<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create permissions
        $permissions = [
            ['name' => 'View Dashboard', 'slug' => 'view_dashboard'],
            ['name' => 'Manage Agents', 'slug' => 'manage_agents'],
            ['name' => 'Create Manager', 'slug' => 'create_manager'],
            ['name' => 'Upload Clients', 'slug' => 'upload_clients'],
            ['name' => 'Send Email', 'slug' => 'send_email'],
            ['name' => 'View Clients', 'slug' => 'view_clients'],
            ['name' => 'Update Clients', 'slug' => 'update_clients'],
            ['name' => 'Delete Clients', 'slug' => 'delete_clients'],
            ['name' => 'Assign Roles', 'slug' => 'assign_roles'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['slug' => $perm['slug']], $perm);
        }

        // Create roles
        $roles = [
            ['name' => 'User', 'slug' => 'user'],
            ['name' => 'Manager', 'slug' => 'manager'],
            ['name' => 'Agent', 'slug' => 'agent'],
            ['name' => 'Client', 'slug' => 'client'],
        ];

        foreach ($roles as $roleData) {
            $role = Role::firstOrCreate(['slug' => $roleData['slug']], $roleData);
            
            // Assign basic permissions to roles
            $role->permissions()->sync(Permission::where('slug', 'view_dashboard')->first());
        }

        // Update test user to manager
        $testUser = User::where('email', 'test@example.com')->first();
        if ($testUser) {
            $testUser->update([
                'role_id' => Role::where('slug', 'manager')->first()->id,
            ]);
        }
    }
}
