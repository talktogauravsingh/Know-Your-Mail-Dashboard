<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Role;
use App\Models\Organization;
use App\Models\AuthPage;
use App\Models\AuthAction;
use App\Models\AuthPageAction;
use App\Models\AuthRole;
use App\Models\AuthRolePageAction;
use App\Models\AuthUserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthPermissionOrgScopingTest extends TestCase
{
    use RefreshDatabase;

    protected $rootUser;
    protected $adminA;
    protected $adminB;
    protected $userA;
    protected $orgA;
    protected $orgB;
    protected $rootRole;
    protected $adminRole;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup base roles in original system
        $this->rootRole = Role::create(['name' => 'Root', 'slug' => 'root']);
        $this->adminRole = Role::create(['name' => 'Admin', 'slug' => 'admin']);

        // Setup organizations
        $this->orgA = Organization::create(['name' => 'Organization A']);
        $this->orgB = Organization::create(['name' => 'Organization B']);

        // Setup users
        $this->rootUser = User::factory()->create([
            'role_id' => $this->rootRole->id,
            'organization_id' => null,
        ]);

        $this->adminA = User::factory()->create([
            'role_id' => $this->adminRole->id,
            'organization_id' => $this->orgA->id,
        ]);

        $this->adminB = User::factory()->create([
            'role_id' => $this->adminRole->id,
            'organization_id' => $this->orgB->id,
        ]);

        $this->userA = User::factory()->create([
            'role_id' => null,
            'organization_id' => $this->orgA->id,
        ]);
    }

    public function test_root_user_bypasses_all_permission_checks()
    {
        $this->assertTrue($this->rootUser->hasAuthPermission('NonExistentPage', 'anyAction'));
        $this->assertFalse($this->adminA->hasAuthPermission('NonExistentPage', 'anyAction'));
    }

    public function test_non_root_users_blocked_from_page_crud_endpoints()
    {
        $this->actingAs($this->adminA, 'sanctum');

        // Should return 403 on storePage
        $response = $this->postJson('/api/auth-permissions/pages', [
            'name' => 'Settings',
        ]);
        $response->assertStatus(403);

        // Root should succeed
        $this->actingAs($this->rootUser, 'sanctum');
        $response = $this->postJson('/api/auth-permissions/pages', [
            'name' => 'Settings',
        ]);
        $response->assertStatus(201);
    }

    public function test_roles_listing_scoped_by_organization()
    {
        // Admin A creates a role
        AuthRole::create([
            'name' => 'Role Org A',
            'description' => 'Org A exclusive role',
            'created_by' => $this->adminA->id,
        ]);

        // Admin B creates a role
        AuthRole::create([
            'name' => 'Role Org B',
            'description' => 'Org B exclusive role',
            'created_by' => $this->adminB->id,
        ]);

        // 1. Admin A listing roles should only see Org A's role
        $this->actingAs($this->adminA, 'sanctum');
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.name', 'Role Org A');

        // 2. Admin B listing roles should only see Org B's role
        $this->actingAs($this->adminB, 'sanctum');
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.name', 'Role Org B');

        // 3. Root listing roles should see both roles
        $this->actingAs($this->rootUser, 'sanctum');
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);
        $response->assertJsonCount(2);
    }

    public function test_admin_cannot_assign_roles_from_other_organization()
    {
        // Role in Org B
        $roleB = AuthRole::create([
            'name' => 'Role Org B',
            'description' => 'Org B exclusive role',
            'created_by' => $this->adminB->id,
        ]);

        $this->actingAs($this->adminA, 'sanctum');

        // Try to assign Role Org B to User A (in Org A)
        $response = $this->postJson('/api/auth-permissions/users/' . $this->userA->id . '/roles', [
            'role_ids' => [$roleB->id],
        ]);

        // Should be forbidden because Role Org B is in another organization
        $response->assertStatus(403);
    }

    public function test_admin_cannot_modify_users_from_other_organization()
    {
        $roleA = AuthRole::create([
            'name' => 'Role Org A',
            'description' => 'Org A exclusive role',
            'created_by' => $this->adminA->id,
        ]);

        // Admin B trying to assign Org A's role to User A (in Org A)
        $this->actingAs($this->adminB, 'sanctum');

        $response = $this->postJson('/api/auth-permissions/users/' . $this->userA->id . '/roles', [
            'role_ids' => [$roleA->id],
        ]);

        // Should return 403 because User A is in Org A
        $response->assertStatus(403);
    }
}
