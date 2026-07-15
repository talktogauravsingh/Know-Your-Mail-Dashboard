<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\AuthPage;
use App\Models\AuthAction;
use App\Models\AuthPageAction;
use App\Models\AuthRole;
use App\Models\AuthRolePageAction;
use App\Models\AuthUserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthPermissionArchitectureTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Create root role in legacy table and assign to test user
        $rootRole = \App\Models\Role::create(['name' => 'Root', 'slug' => 'root']);
        $this->user = User::factory()->create([
            'role_id' => $rootRole->id,
        ]);
    }

    public function test_page_crud_endpoints()
    {
        $this->actingAs($this->user, 'sanctum');

        // Create page
        $response = $this->postJson('/api/auth-permissions/pages', [
            'name' => 'Dashboard',
            'status' => 1,
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('auth_pages', ['name' => 'Dashboard']);

        $pageId = $response->json('id');

        // List pages
        $response = $this->getJson('/api/auth-permissions/pages');
        $response->assertStatus(200);

        // Update page
        $response = $this->putJson('/api/auth-permissions/pages/' . $pageId, [
            'status' => 0,
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('auth_pages', ['id' => $pageId, 'status' => 0]);

        // Delete page
        $response = $this->deleteJson('/api/auth-permissions/pages/' . $pageId);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('auth_pages', ['id' => $pageId]);
    }

    public function test_action_crud_endpoints()
    {
        $this->actingAs($this->user, 'sanctum');

        // Create action
        $response = $this->postJson('/api/auth-permissions/actions', [
            'name' => 'view_reports',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('auth_actions', ['name' => 'view_reports']);

        $actionId = $response->json('id');

        // List actions
        $response = $this->getJson('/api/auth-permissions/actions');
        $response->assertStatus(200);

        // Update action
        $response = $this->putJson('/api/auth-permissions/actions/' . $actionId, [
            'name' => 'view_report_v2',
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('auth_actions', ['id' => $actionId, 'name' => 'view_report_v2']);

        // Delete action
        $response = $this->deleteJson('/api/auth-permissions/actions/' . $actionId);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('auth_actions', ['id' => $actionId]);
    }

    public function test_page_action_mapping()
    {
        $this->actingAs($this->user, 'sanctum');

        $page = AuthPage::create(['name' => 'Users', 'status' => 1]);
        $action = AuthAction::create(['name' => 'edit']);

        $response = $this->postJson('/api/auth-permissions/page-actions', [
            'page_id' => $page->id,
            'action_id' => $action->id,
            'description' => 'Ability to edit users',
            'status' => 1,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('auth_page_actions', [
            'page_id' => $page->id,
            'action_id' => $action->id,
            'description' => 'Ability to edit users',
        ]);

        $pageActionId = $response->json('id');

        // Delete mapping
        $response = $this->deleteJson('/api/auth-permissions/page-actions/' . $pageActionId);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('auth_page_actions', ['id' => $pageActionId]);
    }

    public function test_role_crud_endpoints()
    {
        $this->actingAs($this->user, 'sanctum');

        // Create role
        $response = $this->postJson('/api/auth-permissions/roles', [
            'name' => 'Administrator',
            'description' => 'Manage system configuration',
            'parent_id' => 0,
            'status' => 1,
            'type' => 0,
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('auth_roles', ['name' => 'Administrator', 'created_by' => $this->user->id]);

        $roleId = $response->json('id');

        // List roles
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);

        // Update role
        $response = $this->putJson('/api/auth-permissions/roles/' . $roleId, [
            'description' => 'Full access role',
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('auth_roles', ['id' => $roleId, 'description' => 'Full access role']);

        // Delete role
        $response = $this->deleteJson('/api/auth-permissions/roles/' . $roleId);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('auth_roles', ['id' => $roleId]);
    }

    public function test_assigning_permissions_to_role()
    {
        $this->actingAs($this->user, 'sanctum');

        $role = AuthRole::create([
            'name' => 'Manager',
            'description' => 'Manage team',
            'created_by' => $this->user->id,
        ]);

        $page = AuthPage::create(['name' => 'Campaigns', 'status' => 1]);
        $action = AuthAction::create(['name' => 'publish']);
        $pageAction = AuthPageAction::create([
            'page_id' => $page->id,
            'action_id' => $action->id,
            'description' => 'Publish campaigns',
        ]);

        $response = $this->postJson('/api/auth-permissions/roles/' . $role->id . '/permissions', [
            'permissions' => [
                [
                    'page_action_id' => $pageAction->id,
                    'access' => 1,
                ]
            ]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('auth_role_page_actions', [
            'role_id' => $role->id,
            'page_action_id' => $pageAction->id,
            'access' => 1,
        ]);
    }

    public function test_assigning_multiple_roles_to_user()
    {
        $this->actingAs($this->user, 'sanctum');

        $role1 = AuthRole::create([
            'name' => 'Role A',
            'description' => 'A description',
            'created_by' => $this->user->id,
        ]);

        $role2 = AuthRole::create([
            'name' => 'Role B',
            'description' => 'B description',
            'created_by' => $this->user->id,
        ]);

        $response = $this->postJson('/api/auth-permissions/users/' . $this->user->id . '/roles', [
            'role_ids' => [$role1->id, $role2->id],
            'status' => 1,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('auth_user_roles', [
            'user_id' => $this->user->id,
            'role_id' => $role1->id,
            'status' => 1,
        ]);
        $this->assertDatabaseHas('auth_user_roles', [
            'user_id' => $this->user->id,
            'role_id' => $role2->id,
            'status' => 1,
        ]);

        $response = $this->getJson('/api/auth-permissions/users/' . $this->user->id . '/roles');
        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_page_action_middleware_authorization()
    {
        $nonRootUser = User::factory()->create();

        $role = AuthRole::create([
            'name' => 'Billing Viewer',
            'description' => 'Read billing data',
            'created_by' => $this->user->id,
        ]);

        $page = AuthPage::create(['name' => 'Billing', 'status' => 1]);
        $action = AuthAction::create(['name' => 'view']);
        $pageAction = AuthPageAction::create([
            'page_id' => $page->id,
            'action_id' => $action->id,
            'description' => 'View invoices',
        ]);

        // Assign page action to role
        AuthRolePageAction::create([
            'role_id' => $role->id,
            'page_action_id' => $pageAction->id,
            'access' => 1,
        ]);

        // Test hasAuthPermission logic directly
        $this->assertFalse($nonRootUser->hasAuthPermission('Billing', 'view'));

        // Prepare request
        $request = \Illuminate\Http\Request::create('/test-route-protection', 'GET');
        $request->setUserResolver(fn() => $nonRootUser);

        $middleware = new \App\Http\Middleware\PageActionMiddleware();

        // 1. Should abort with 403 when user doesn't have role
        try {
            $middleware->handle($request, function () {
                return response('success');
            }, 'Billing', 'view');
            $this->fail('Expected HttpException not thrown.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertEquals(403, $e->getStatusCode());
            $this->assertEquals('Insufficient page action permissions.', $e->getMessage());
        }

        // 2. Assign role to user
        AuthUserRole::create([
            'user_id' => $nonRootUser->id,
            'role_id' => $role->id,
            'status' => 1,
            'added_by' => $this->user->id,
        ]);

        // Now hasAuthPermission should be true
        $this->assertTrue($nonRootUser->hasAuthPermission('Billing', 'view'));

        // Middleware should pass and return success response
        $response = $middleware->handle($request, function () {
            return response('success');
        }, 'Billing', 'view');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('success', $response->getContent());
    }
}
