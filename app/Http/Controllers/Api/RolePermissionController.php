<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\RoleRepository;
use App\Models\Role;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    protected $roleRepo;

    public function __construct(RoleRepository $roleRepo)
    {
        $this->roleRepo = $roleRepo;
    }

    public function index(Role $role)
    {
        $permissions = $this->roleRepo->getPermissionsForRole($role);
        return $permissions;
    }

    public function store(Request $request, Role $role)
    {
        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $this->roleRepo->attachPermissions($role, $validated['permission_ids']);

        $role->load('permissions');
        return $role;
    }

    public function destroy(Request $request, Role $role)
    {
        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $this->roleRepo->detachPermissions($role, $validated['permission_ids']);

        $role->fresh()->load('permissions');
        return $role;
    }
}

