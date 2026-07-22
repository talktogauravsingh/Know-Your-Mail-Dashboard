<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\DB;

#[Fillable(['name', 'email', 'phone_number', 'password', 'role_id', 'organization_id', 'created_by', 'must_change_password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Get subordinate user IDs recursively (include self)
     */
    public function getSubordinateIds(bool $includeSelf = true): array
    {
        $userId = $this->id;
        
        $subIds = DB::select("
            WITH RECURSIVE subordinate_tree AS (
                SELECT id FROM users WHERE id = ?
                UNION ALL
                SELECT u.id FROM users u
                INNER JOIN subordinate_tree st ON u.created_by = st.id
                WHERE u.id != ?
            )
            SELECT DISTINCT id FROM subordinate_tree
        ", [$userId, $userId]);
        
        return array_column($subIds, 'id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function createdManagers(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(User::class, 'created_by');
    }

    public function permissions(): BelongsToMany
    {
        if ($this->relationLoaded('role')) {
            return $this->belongsToMany(Permission::class, 'user_permissions')
                        ->union(
                            $this->role->permissions()
                        );
        }
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function hasPermission(string $permissionSlug): bool
    {
        return $this->permissions()->where('slug', $permissionSlug)->exists();
    }

    public function hasAnyPermission(array $permissionSlugs): bool
    {
        return $this->permissions()->whereIn('slug', $permissionSlugs)->exists();
    }

    public function authRoles(): BelongsToMany
    {
        return $this->belongsToMany(AuthRole::class, 'auth_user_roles', 'user_id', 'role_id')
                    ->withPivot('status', 'added_by')
                    ->withTimestamps('created', 'updated');
    }

    public function hasAuthPermission(string $pageName, string $actionName): bool
    {
        // root user has permission for everything by default
        if (($this->role && $this->role->slug === 'root') || 
            $this->authRoles()->where('auth_roles.name', 'root')->where('auth_user_roles.status', 1)->exists()) {
            return true;
        }

        $roleIds = $this->authRoles()->where('auth_user_roles.status', 1)->pluck('auth_roles.id');

        if ($roleIds->isEmpty()) {
            return false;
        }

        return DB::table('auth_role_page_actions')
            ->join('auth_page_actions', 'auth_role_page_actions.page_action_id', '=', 'auth_page_actions.id')
            ->join('auth_pages', 'auth_page_actions.page_id', '=', 'auth_pages.id')
            ->join('auth_actions', 'auth_page_actions.action_id', '=', 'auth_actions.id')
            ->whereIn('auth_role_page_actions.role_id', $roleIds)
            ->where('auth_pages.name', $pageName)
            ->where('auth_actions.name', $actionName)
            ->where('auth_pages.status', 1)
            ->where('auth_page_actions.status', 1)
            ->where('auth_role_page_actions.access', 1)
            ->exists();
    }

    public function getAuthRolePageActionList()
    {
        $userId = $this->id;

        $roles = AuthUserRole::where("user_id", $userId)
            ->where('status', 1)
            ->with([
                'pageActions.pageActionPivot.page',
                'pageActions.pageActionPivot.action',
            ])
            ->get();

        $permissionList = [
            "isRoot" => 0,
            "permissionList" => []
        ];

        // Check if root user (either via legacy role slug 'root' or auth role name 'root')
        if (($this->role && $this->role->slug === 'root') || 
            $this->authRoles()->where('auth_roles.name', 'root')->where('auth_user_roles.status', 1)->exists()) {
            $permissionList['isRoot'] = 1;
        }

        foreach ($roles as $userRole) {
            $role = $userRole->role;
            if (!$role) {
                continue;
            }

            if (in_array($role->id, [1, 2]) || $role->name === 'root') {
                $permissionList['isRoot'] = 1;
            }

            foreach ($userRole->pageActions as $rolePageAction) {
                $pageAction = $rolePageAction->pageActionPivot;
                if (!$pageAction || $pageAction->status != 1) {
                    continue;
                }

                $page = $pageAction->page;
                $action = $pageAction->action;

                if ($page && $action) {
                    if (!isset($permissionList["permissionList"][$page->id])) {
                        $permissionList["permissionList"][$page->id] = [];
                    }
                    $permissionList["permissionList"][$page->id][$action->id] = [
                        "pageId" => $page->id,
                        "pageName" => $page->name,
                        "actionId" => $action->id,
                        "actionName" => $action->name
                    ];
                }
            }
        }

        return $permissionList;
    }

    public function getAuthPermissionsAttribute()
    {
        return $this->getAuthRolePageActionList();
    }
}

