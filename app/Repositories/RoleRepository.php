<?php

namespace App\Repositories;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Str;

class RoleRepository
{
    public function create(array $data): Role
    {
        $data['slug'] = Str::slug($data['name']);
        return Role::create($data);
    }

    public function update(Role $role, array $data): bool
    {
        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        return $role->update($data);
    }

    public function attachPermissions(Role $role, array $permissionIds): void
    {
        $role->permissions()->sync($permissionIds);
    }

    public function detachPermissions(Role $role, array $permissionIds): void
    {
        $role->permissions()->detach($permissionIds);
    }

    public function getPermissionsForRole(Role $role)
    {
        return $role->permissions;
    }

    public function findBySlug(string $slug): ?Role
    {
        return Role::where('slug', $slug)->first();
    }
}

