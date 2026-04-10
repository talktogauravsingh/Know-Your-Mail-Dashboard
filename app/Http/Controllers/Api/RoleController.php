<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\RoleRepository;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    protected $roleRepo;

    public function __construct(RoleRepository $roleRepo)
    {
        $this->roleRepo = $roleRepo;
    }

    public function index()
    {
        return Role::with('permissions')->get();
    }

    public function show(Role $role)
    {
        $role->load('permissions');
        return $role;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles',
        ]);

        $role = $this->roleRepo->create($validated);

        return response()->json($role->load('permissions'), 201);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $role->id,
        ]);

        $this->roleRepo->update($role, $validated);

        $role->load('permissions');
        return $role;
    }

    public function destroy(Role $role)
    {
$role->update(['status' => 0]);
        return response()->json(null, 204);
    }
}

