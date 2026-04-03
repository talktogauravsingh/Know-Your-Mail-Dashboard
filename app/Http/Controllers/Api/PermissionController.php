<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\PermissionRepository;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    protected $permissionRepo;

    public function __construct(PermissionRepository $permissionRepo)
    {
        $this->permissionRepo = $permissionRepo;
    }

    public function index()
    {
        return Permission::all();
    }

    public function show(Permission $permission)
    {
        return $permission;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions',
        ]);

        $permission = $this->permissionRepo->create($validated);

        return response()->json($permission, 201);
    }

    public function update(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:permissions,name,' . $permission->id,
        ]);

        $this->permissionRepo->update($permission, $validated);

        return $permission;
    }

    public function destroy(Permission $permission)
    {
        $permission->delete();
        return response()->json(null, 204);
    }
}

