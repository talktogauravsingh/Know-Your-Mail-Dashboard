<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = Organization::all();
        $roles = Role::all();

        $superAdminRole = $roles->where('slug', 'super-admin')->first();
        $managerRole = $roles->where('slug', 'manager')->first();
        $userRole = $roles->where('slug', 'user')->first();

        foreach ($organizations as $org) {
            // Org admin (super-admin)
            User::firstOrCreate(
                ['email' => 'admin@' . strtolower(str_replace(' ', '', $org->name)) . '.com'],
                [
                    'name' => $org->name . ' Admin',
                    'email' => 'admin@' . strtolower(str_replace(' ', '', $org->name)) . '.com',
                    'password' => Hash::make('password'),
                    'role_id' => $superAdminRole->id,
                    'organization_id' => $org->id,
                ]
            );

            // Manager
            User::firstOrCreate(
                ['email' => 'manager@' . strtolower(str_replace(' ', '', $org->name)) . '.com'],
                [
                    'name' => $org->name . ' Manager',
                    'email' => 'manager@' . strtolower(str_replace(' ', '', $org->name)) . '.com',
                    'password' => Hash::make('password'),
                    'role_id' => $managerRole->id,
                    'organization_id' => $org->id,
                    'created_by' => User::where('organization_id', $org->id)->first()?->id,
                ]
            );

            // 3 agents/users
            for ($i = 1; $i <= 3; $i++) {
                User::firstOrCreate(
                    ['email' => "agent{$i}@" . strtolower(str_replace(' ', '', $org->name)) . '.com'],
                    [
                        'name' => $org->name . " Agent {$i}",
                        'email' => "agent{$i}@" . strtolower(str_replace(' ', '', $org->name)) . '.com',
                        'password' => Hash::make('password'),
                        'role_id' => $userRole->id,
                        'organization_id' => $org->id,
                        'created_by' => User::where('email', 'manager@' . strtolower(str_replace(' ', '', $org->name)) . '.com')->first()?->id,
                    ]
                );
            }
        }
    }
}

