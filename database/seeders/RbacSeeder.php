<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RbacSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (!Role::where('slug', 'super-admin')->exists()) {
            Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
        }
        if (!Role::where('slug', 'admin')->exists()) {
            Role::create(['name' => 'Admin', 'slug' => 'admin']);
        }
        if (!Role::where('slug', 'manager')->exists()) {
            Role::create(['name' => 'Manager', 'slug' => 'manager']);
        }
        if (!Role::where('slug', 'user')->exists()) {
            Role::create(['name' => 'User', 'slug' => 'user']);
        }

        if (!Permission::where('slug', 'view_roles')->exists()) {
            Permission::create(['name' => 'View Roles', 'slug' => 'view_roles']);
        }
        if (!Permission::where('slug', 'manage_roles')->exists()) {
            Permission::create(['name' => 'Manage Roles', 'slug' => 'manage_roles']);
        }
        if (!Permission::where('slug', 'view_permissions')->exists()) {
            Permission::create(['name' => 'View Permissions', 'slug' => 'view_permissions']);
        }
        if (!Permission::where('slug', 'manage_permissions')->exists()) {
            Permission::create(['name' => 'Manage Permissions', 'slug' => 'manage_permissions']);
        }
        if (!Permission::where('slug', 'create_manager')->exists()) {
            Permission::create(['name' => 'Create Manager', 'slug' => 'create_manager']);
        }

        $superAdminRole = Role::where('slug', 'super-admin')->first();
        $adminRole = Role::where('slug', 'admin')->first();
        $managerRole = Role::where('slug', 'manager')->first();

        $viewRoles = Permission::where('slug', 'view_roles')->first();
        $manageRoles = Permission::where('slug', 'manage_roles')->first();
        $viewPermissions = Permission::where('slug', 'view_permissions')->first();
        $managePermissions = Permission::where('slug', 'manage_permissions')->first();
        $createManager = Permission::where('slug', 'create_manager')->first();

        if ($superAdminRole && $viewRoles) {
            $superAdminRole->permissions()->syncWithoutDetaching([$viewRoles->id, $manageRoles->id ?? 0, $viewPermissions->id ?? 0, $managePermissions->id ?? 0, $createManager->id ?? 0]);
        }
        if ($adminRole && $viewRoles) {
            $adminRole->permissions()->syncWithoutDetaching([$viewRoles->id, $manageRoles->id ?? 0, $viewPermissions->id ?? 0, $managePermissions->id ?? 0]);
        }
        if ($managerRole && $viewRoles) {
            $managerRole->permissions()->syncWithoutDetaching([$viewRoles->id, $createManager->id ?? 0]);
        }
    }
}

