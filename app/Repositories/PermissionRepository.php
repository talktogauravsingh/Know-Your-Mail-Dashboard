<?php

namespace App\Repositories;

use App\Models\Permission;
use Illuminate\Support\Str;

class PermissionRepository
{
    public function create(array $data): Permission
    {
        $data['slug'] = Str::slug($data['name']);
        return Permission::create($data);
    }

    public function update(Permission $permission, array $data): bool
    {
        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        return $permission->update($data);
    }

    public function findBySlug(string $slug): ?Permission
    {
        return Permission::where('slug', $slug)->first();
    }
}

