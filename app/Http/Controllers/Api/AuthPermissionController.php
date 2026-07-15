<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthPage;
use App\Models\AuthAction;
use App\Models\AuthPageAction;
use App\Models\AuthRole;
use App\Models\AuthRolePageAction;
use App\Models\AuthUserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthPermissionController extends Controller
{
    // =========================================================================
    // Helpers
    // =========================================================================

    protected function checkRootAccess(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser || $currentUser->role?->slug !== 'root') {
            abort(403, 'Only root users can modify global settings.');
        }
    }

    protected function checkRoleAccess(Request $request, AuthRole $role)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            abort(401, 'Unauthenticated.');
        }

        if ($currentUser->role?->slug !== 'root') {
            $role->load('creator');
            if (!$role->creator || $role->creator->organization_id !== $currentUser->organization_id) {
                abort(403, 'Unauthorized access to this role.');
            }
        }
    }

    protected function checkUserAccess(Request $request, User $user)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            abort(401, 'Unauthenticated.');
        }

        if ($currentUser->role?->slug !== 'root') {
            if ($user->organization_id !== $currentUser->organization_id) {
                abort(403, 'Unauthorized access to this user.');
            }
        }
    }

    // =========================================================================
    // Page CRUD
    // =========================================================================

    public function getPages()
    {
        return response()->json(AuthPage::with('pageActions.action')->get());
    }

    public function storePage(Request $request)
    {
        $this->checkRootAccess($request);

        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:auth_pages,name',
            'status' => 'sometimes|integer',
        ]);

        $page = AuthPage::create($validated);

        return response()->json($page, 201);
    }

    public function updatePage(Request $request, AuthPage $page)
    {
        $this->checkRootAccess($request);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:50|unique:auth_pages,name,' . $page->id,
            'status' => 'sometimes|integer',
        ]);

        $page->update($validated);

        return response()->json($page);
    }

    public function destroyPage(Request $request, AuthPage $page)
    {
        $this->checkRootAccess($request);

        $page->delete();
        return response()->json(null, 204);
    }

    // =========================================================================
    // Action CRUD
    // =========================================================================

    public function getActions()
    {
        return response()->json(AuthAction::all());
    }

    public function storeAction(Request $request)
    {
        $this->checkRootAccess($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:auth_actions,name',
        ]);

        $action = AuthAction::create($validated);

        return response()->json($action, 201);
    }

    public function updateAction(Request $request, AuthAction $action)
    {
        $this->checkRootAccess($request);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:auth_actions,name,' . $action->id,
        ]);

        $action->update($validated);

        return response()->json($action);
    }

    public function destroyAction(Request $request, AuthAction $action)
    {
        $this->checkRootAccess($request);

        $action->delete();
        return response()->json(null, 204);
    }

    // =========================================================================
    // Page Action mapping
    // =========================================================================

    public function assignPageAction(Request $request)
    {
        $this->checkRootAccess($request);

        $validated = $request->validate([
            'page_id' => 'required|exists:auth_pages,id',
            'action_id' => 'required|exists:auth_actions,id',
            'description' => 'required|string',
            'status' => 'sometimes|integer',
        ]);

        // Prevent duplicate page-action associations
        $pageAction = AuthPageAction::firstOrCreate(
            [
                'page_id' => $validated['page_id'],
                'action_id' => $validated['action_id'],
            ],
            [
                'description' => $validated['description'],
                'status' => $validated['status'] ?? 1,
            ]
        );

        return response()->json($pageAction->load(['page', 'action']), 201);
    }

    public function removePageAction(Request $request, AuthPageAction $pageAction)
    {
        $this->checkRootAccess($request);

        $pageAction->delete();
        return response()->json(null, 204);
    }

    // =========================================================================
    // Role CRUD
    // =========================================================================

    public function getRoles(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            abort(401, 'Unauthenticated.');
        }

        $query = AuthRole::with(['parent', 'children', 'rolePageActions.pageAction.page', 'rolePageActions.pageAction.action']);

        if ($currentUser->role?->slug !== 'root') {
            $query->whereHas('creator', function ($q) use ($currentUser) {
                $q->where('organization_id', $currentUser->organization_id);
            });
        }

        return response()->json($query->get());
    }

    public function storeRole(Request $request)
    {
        $currentUser = $request->user();
        if (!$currentUser) {
            abort(401, 'Unauthenticated.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:auth_roles,name',
            'description' => 'required|string',
            'parent_id' => 'sometimes|integer',
            'status' => 'sometimes|integer',
            'type' => 'sometimes|integer',
        ]);

        $validated['created_by'] = $currentUser->id;
        $validated['parent_id'] = $validated['parent_id'] ?? 0;
        $validated['status'] = $validated['status'] ?? 1;
        $validated['type'] = $validated['type'] ?? 0;

        $role = AuthRole::create($validated);

        return response()->json($role, 201);
    }

    public function updateRole(Request $request, AuthRole $role)
    {
        $this->checkRoleAccess($request, $role);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:auth_roles,name,' . $role->id,
            'description' => 'sometimes|string',
            'parent_id' => 'sometimes|integer',
            'status' => 'sometimes|integer',
            'type' => 'sometimes|integer',
        ]);

        $role->update($validated);

        return response()->json($role);
    }

    public function destroyRole(Request $request, AuthRole $role)
    {
        $this->checkRoleAccess($request, $role);

        $role->delete();
        return response()->json(null, 204);
    }

    // =========================================================================
    // Role Permissions mapping (Page Actions)
    // =========================================================================

    public function assignRolePermissions(Request $request, AuthRole $role)
    {
        $this->checkRoleAccess($request, $role);

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.page_action_id' => 'required|exists:auth_page_actions,id',
            'permissions.*.access' => 'sometimes|integer',
        ]);

        DB::transaction(function () use ($role, $validated) {
            // Remove existing permissions
            AuthRolePageAction::where('role_id', $role->id)->delete();

            // Insert new permissions
            foreach ($validated['permissions'] as $perm) {
                AuthRolePageAction::create([
                    'role_id' => $role->id,
                    'page_action_id' => $perm['page_action_id'],
                    'access' => $perm['access'] ?? 1,
                ]);
            }
        });

        return response()->json([
            'message' => 'Role permissions updated successfully.',
            'role' => $role->load('rolePageActions.pageAction'),
        ]);
    }

    // =========================================================================
    // User Roles assignment
    // =========================================================================

    public function getUserRoles(Request $request, User $user)
    {
        $this->checkUserAccess($request, $user);

        return response()->json($user->authRoles);
    }

    public function assignUserRoles(Request $request, User $user)
    {
        $this->checkUserAccess($request, $user);

        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'required|exists:auth_roles,id',
            'status' => 'sometimes|integer',
        ]);

        $currentUser = $request->user();
        $addedBy = $currentUser ? $currentUser->id : 1;
        $status = $validated['status'] ?? 1;

        if ($currentUser && $currentUser->role?->slug !== 'root') {
            foreach ($validated['role_ids'] as $roleId) {
                $role = AuthRole::find($roleId);
                $role->load('creator');
                if (!$role->creator || $role->creator->organization_id !== $currentUser->organization_id) {
                    abort(403, 'Unauthorized to assign role: ' . $role->name);
                }
            }
        }

        $syncData = [];
        foreach ($validated['role_ids'] as $roleId) {
            $syncData[$roleId] = [
                'status' => $status,
                'added_by' => $addedBy,
            ];
        }

        $user->authRoles()->sync($syncData);

        return response()->json([
            'message' => 'User roles updated successfully.',
            'roles' => $user->fresh()->authRoles,
        ]);
    }
}
