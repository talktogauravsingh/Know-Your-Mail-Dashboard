<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Organization;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\PasswordReset;

class AuthRepository
{
    /**
     * Create Normal User
     */
    public function createUser(array $data)
    {
        $roleId = Role::where('slug', 'super-admin')->value('id');

        if (!$roleId) {
            throw new \Exception('Default role (super-admin) not found');
        }

        return DB::transaction(function () use ($data, $roleId) {
            $nameParts = explode(' ', trim($data['name']));
            $firstName = $nameParts[0] ?? 'User';
            
            $isSkipped = filter_var($data['is_skipped'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $orgTypeSlug = $isSkipped ? 'individual' : ($data['organization_type'] ?? 'individual');
            
            $orgTypeId = \App\Models\OrganizationType::where('slug', $orgTypeSlug)->value('id') 
                ?? \App\Models\OrganizationType::where('slug', 'individual')->value('id');

            if ($isSkipped) {
                $orgName = $firstName . '-' . Str::random(5) . "'s Organization";
            } else {
                $orgName = $data['organization_name'] ?? null;
                if (empty($orgName)) {
                    $orgName = $firstName . "'s Organization";
                }
            }

            $organization = Organization::create([
                'name'     => $orgName,
                'org_type' => $orgTypeId,
            ]);

            return User::create([
                'name'            => $data['name'],
                'email'           => $data['email'],
                'phone_number'    => $data['phone_number'] ?? null,
                'password'        => Hash::make($data['password']),
                'role_id'         => $roleId,
                'organization_id' => $organization->id,
            ]);
        });
    }

    /**
     * Login User
     */
    public function login(array $credentials)
    {
        if (!Auth::attempt($credentials)) {
            return null;
        }

        $user = Auth::user();

        // Optional: Active check
        if (isset($user->is_active) && !$user->is_active) {
            throw new \Exception('User is inactive');
        }

        return $user->load('role.permissions');
    }

    /**
     * Logout User
     */
    public function logout($user)
    {
        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }
    }

    /**
     * Create Manager
     */
    public function createManager(array $data, $loggedInUser)
    {
        return DB::transaction(function () use ($data, $loggedInUser) {

            $permissions = collect();

            // Validate permissions
            if (!empty($data['permission_slugs'])) {
                $permissions = Permission::whereIn('slug', $data['permission_slugs'])->get();

                foreach ($permissions as $perm) {
                    if (!$loggedInUser->hasPermission($perm->slug)) {
                        throw new \Exception("Cannot assign permission '{$perm->slug}'");
                    }
                }
            }

            $organizationId = $loggedInUser->organization_id;
            if (!empty($data['organization_id']) && (int) $data['organization_id'] !== (int) $organizationId) {
                throw new \Exception('Managers can only be created inside your organization.');
            }

            // Create manager
            $manager = User::create([
                'name'            => $data['name'],
                'email'           => $data['email'],
                'password'        => Hash::make($data['password']),
                'role_id'         => $data['role_id'],
                'organization_id' => $organizationId,
                'created_by'      => $loggedInUser->id,
            ]);

            // Attach permissions
            if ($permissions->isNotEmpty()) {
                $manager->permissions()->attach($permissions->pluck('id'));
            }

            return $manager->load('role.permissions');
        });
    }

    /**
     * Reset User Password
     */
    public function resetUserPassword($user, $password)
    {
        DB::transaction(function () use ($user, $password) {

            $user->forceFill([
                'password' => Hash::make($password),
            ])->setRememberToken(Str::random(60));

            $user->save();

            event(new PasswordReset($user));
        });
    }
}
