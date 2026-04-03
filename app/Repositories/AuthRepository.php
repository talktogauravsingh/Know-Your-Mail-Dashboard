<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
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
        $roleId = Role::where('slug', 'user')->value('id');

        if (!$roleId) {
            throw new \Exception('Default role (user) not found');
        }

        return User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role_id'  => $roleId,
        ]);
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

            // Create manager
            $manager = User::create([
                'name'            => $data['name'],
                'email'           => $data['email'],
                'password'        => Hash::make($data['password']),
                'role_id'         => $data['role_id'],
                'organization_id' => $data['organization_id'] ?? null,
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