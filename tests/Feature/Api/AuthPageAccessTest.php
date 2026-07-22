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
use Tests\TestCase;

class AuthPageAccessTest extends TestCase
{
    use RefreshDatabase;

    protected $rootUser;
    protected $normalUser;
    protected $role;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create a root user
        $rootLegacyRole = \App\Models\Role::create(['name' => 'Root', 'slug' => 'root']);
        $this->rootUser = User::factory()->create([
            'role_id' => $rootLegacyRole->id,
        ]);

        // 2. Create a normal user and a custom role
        $legacyUserRole = \App\Models\Role::create(['name' => 'User', 'slug' => 'user']);
        $this->normalUser = User::factory()->create([
            'role_id' => $legacyUserRole->id,
        ]);

        // Seed root/admin roles first with ID 1 and 2
        \Illuminate\Support\Facades\DB::table('auth_roles')->insert([
            'id' => 1,
            'name' => 'root',
            'description' => 'Root Role',
            'parent_id' => 0,
            'status' => 1,
            'type' => 0,
            'created_by' => $this->rootUser->id,
        ]);

        \Illuminate\Support\Facades\DB::table('auth_roles')->insert([
            'id' => 2,
            'name' => 'admin',
            'description' => 'Admin Role',
            'parent_id' => 0,
            'status' => 1,
            'type' => 0,
            'created_by' => $this->rootUser->id,
        ]);

        // Marketing manager role will get ID 3 (auto-increment)
        $this->role = AuthRole::create([
            'name' => 'Marketing Manager',
            'description' => 'Handles marketing campaigns',
            'created_by' => $this->rootUser->id,
            'status' => 1,
        ]);

        AuthUserRole::create([
            'user_id' => $this->normalUser->id,
            'role_id' => $this->role->id,
            'status' => 1,
            'added_by' => $this->rootUser->id,
        ]);

        // 3. Setup sidebar pages using the defined page constants
        $pages = [
            AUTH_PAGE_OVERVIEW => 'Overview',
            AUTH_PAGE_BILLING => 'Billing & Plan',
            AUTH_PAGE_CAMPAIGNS => 'Campaigns',
            AUTH_PAGE_TEMPLATES => 'Templates',
            AUTH_PAGE_AUTOMATION => 'Automation',
            AUTH_PAGE_AUDIENCE => 'Audience',
            AUTH_PAGE_GLOBAL_IMPORT => 'Global Import',
            AUTH_PAGE_SETTINGS => 'Settings',
            AUTH_PAGE_FOUNDER_CONSOLE => 'Founder Console',
        ];

        foreach ($pages as $id => $name) {
            \Illuminate\Support\Facades\DB::table('auth_pages')->insert([
                'id' => $id,
                'name' => $name,
                'status' => 1,
            ]);
        }

        // 4. Setup actions using the action constants
        $actions = [
            AUTH_ACTION_ALL => 'all',
            AUTH_ACTION_VIEW => 'view',
            AUTH_ACTION_CREATE => 'create',
            AUTH_ACTION_EDIT => 'edit',
            AUTH_ACTION_DELETE => 'delete',
        ];

        foreach ($actions as $id => $name) {
            \Illuminate\Support\Facades\DB::table('auth_actions')->insert([
                'id' => $id,
                'name' => $name,
            ]);
        }
    }

    public function test_root_user_has_all_access_by_default()
    {
        $this->actingAs($this->rootUser, 'sanctum');

        // Root should be allowed access to all pages and actions regardless of DB mappings
        foreach ([AUTH_PAGE_OVERVIEW, AUTH_PAGE_CAMPAIGNS, AUTH_PAGE_SETTINGS] as $pageId) {
            foreach ([AUTH_ACTION_VIEW, AUTH_ACTION_EDIT, AUTH_ACTION_DELETE] as $actionId) {
                $this->assertEquals(AUTH_STATUS_ALLOW, authPageAccess($pageId, $actionId));
                $this->assertTrue(hasPermission($pageId, $actionId));
            }
        }
    }

    public function test_normal_user_denied_access_without_role_permissions()
    {
        $this->actingAs($this->normalUser, 'sanctum');

        // Since no page actions are assigned to the Marketing Manager role, access should be denied
        foreach ([AUTH_PAGE_OVERVIEW, AUTH_PAGE_CAMPAIGNS, AUTH_PAGE_SETTINGS] as $pageId) {
            foreach ([AUTH_ACTION_VIEW, AUTH_ACTION_EDIT] as $actionId) {
                $this->assertEquals(AUTH_STATUS_NOTALLOW, authPageAccess($pageId, $actionId));
                $this->assertFalse(hasPermission($pageId, $actionId));
            }
        }
    }

    public function test_normal_user_allowed_access_with_role_permissions()
    {
        // 1. Assign "view" and "create" actions for "Campaigns" to the role
        $pageActionView = AuthPageAction::create([
            'page_id' => AUTH_PAGE_CAMPAIGNS,
            'action_id' => AUTH_ACTION_VIEW,
            'description' => 'View Campaigns',
            'status' => 1,
        ]);

        $pageActionCreate = AuthPageAction::create([
            'page_id' => AUTH_PAGE_CAMPAIGNS,
            'action_id' => AUTH_ACTION_CREATE,
            'description' => 'Create Campaigns',
            'status' => 1,
        ]);

        AuthRolePageAction::create([
            'role_id' => $this->role->id,
            'page_action_id' => $pageActionView->id,
            'access' => 1,
        ]);

        AuthRolePageAction::create([
            'role_id' => $this->role->id,
            'page_action_id' => $pageActionCreate->id,
            'access' => 1,
        ]);

        // 2. Authenticate and test
        $this->actingAs($this->normalUser, 'sanctum');

        // Should be allowed to view and create campaigns
        $this->assertEquals(AUTH_STATUS_ALLOW, authPageAccess(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_VIEW));
        $this->assertTrue(hasPermission(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_VIEW));

        $this->assertEquals(AUTH_STATUS_ALLOW, authPageAccess(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_CREATE));
        $this->assertTrue(hasPermission(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_CREATE));

        // Should NOT be allowed to edit campaigns or view Overview/Settings
        $this->assertEquals(AUTH_STATUS_NOTALLOW, authPageAccess(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_EDIT));
        $this->assertFalse(hasPermission(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_EDIT));

        $this->assertEquals(AUTH_STATUS_NOTALLOW, authPageAccess(AUTH_PAGE_OVERVIEW, AUTH_ACTION_VIEW));
        $this->assertFalse(hasPermission(AUTH_PAGE_OVERVIEW, AUTH_ACTION_VIEW));
    }

    public function test_all_actions_wildcard_permission()
    {
        // 1. Assign "all" action for "Overview" page to the role
        $pageActionAll = AuthPageAction::create([
            'page_id' => AUTH_PAGE_OVERVIEW,
            'action_id' => AUTH_ACTION_ALL,
            'description' => 'All Overview Actions',
            'status' => 1,
        ]);

        AuthRolePageAction::create([
            'role_id' => $this->role->id,
            'page_action_id' => $pageActionAll->id,
            'access' => 1,
        ]);

        $this->actingAs($this->normalUser, 'sanctum');

        // Having AUTH_ACTION_ALL should grant access to view, edit, delete or any other action on the Overview page
        $this->assertEquals(AUTH_STATUS_ALLOW, authPageAccess(AUTH_PAGE_OVERVIEW, AUTH_ACTION_VIEW));
        $this->assertTrue(hasPermission(AUTH_PAGE_OVERVIEW, AUTH_ACTION_VIEW));

        $this->assertEquals(AUTH_STATUS_ALLOW, authPageAccess(AUTH_PAGE_OVERVIEW, AUTH_ACTION_EDIT));
        $this->assertTrue(hasPermission(AUTH_PAGE_OVERVIEW, AUTH_ACTION_EDIT));

        // Still should not have access to Campaigns page
        $this->assertEquals(AUTH_STATUS_NOTALLOW, authPageAccess(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_VIEW));
        $this->assertFalse(hasPermission(AUTH_PAGE_CAMPAIGNS, AUTH_ACTION_VIEW));
    }

    public function test_root_hiding_and_protection_restrictions()
    {
        // Create settings view page action and map it to manager role
        $settingsViewPageAction = AuthPageAction::create([
            'page_id' => AUTH_PAGE_SETTINGS,
            'action_id' => AUTH_ACTION_VIEW,
            'description' => 'View settings page',
            'status' => 1,
        ]);
        AuthRolePageAction::create([
            'role_id' => $this->role->id,
            'page_action_id' => $settingsViewPageAction->id,
            'access' => 1,
        ]);

        // 1. Create a root user under techknowyourmail@gmail.com
        $rootUser = User::factory()->create([
            'email' => 'techknowyourmail@gmail.com',
            'role_id' => \App\Models\Role::where('slug', 'root')->first()->id,
            'organization_id' => $this->normalUser->organization_id,
        ]);

        $adminUser = User::factory()->create([
            'email' => 'admin_user@example.com',
            'role_id' => $this->normalUser->role_id,
            'organization_id' => $this->normalUser->organization_id,
        ]);

        AuthUserRole::create([
            'user_id' => $adminUser->id,
            'role_id' => $this->role->id,
            'status' => 1,
            'added_by' => $rootUser->id,
        ]);

        // Assert root role exists
        $rootRole = AuthRole::where('name', 'root')->first();
        $this->assertNotNull($rootRole);

        // --- TEST 1: getRoles list isolation ---
        // Logged in as techknowyourmail@gmail.com
        $this->actingAs($rootUser, 'sanctum');
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);
        $roleNames = collect($response->json())->pluck('name');
        $this->assertTrue($roleNames->contains('root'));

        // Logged in as a different user
        $this->actingAs($adminUser, 'sanctum');
        $response = $this->getJson('/api/auth-permissions/roles');
        $response->assertStatus(200);
        $roleNames = collect($response->json())->pluck('name');
        $this->assertFalse($roleNames->contains('root'));

        // --- TEST 2: prevent other users from creating/updating/deleting root role ---
        $this->actingAs($adminUser, 'sanctum');
        $response = $this->postJson('/api/auth-permissions/roles', [
            'name' => 'root',
            'description' => 'Try to recreate root',
        ]);
        $response->assertStatus(403);

        $response = $this->putJson('/api/auth-permissions/roles/' . $rootRole->id, [
            'name' => 'root-hacked',
        ]);
        $response->assertStatus(403);

        $response = $this->deleteJson('/api/auth-permissions/roles/' . $rootRole->id);
        $response->assertStatus(403);

        // --- TEST 3: organization users list isolation ---
        // Logged in as techknowyourmail@gmail.com -> can see all including root user
        $this->actingAs($rootUser, 'sanctum');
        $response = $this->getJson('/api/organization/users');
        $response->assertStatus(200);
        $emails = collect($response->json())->pluck('email');
        $this->assertTrue($emails->contains('techknowyourmail@gmail.com'));

        // Logged in as other user -> cannot see root user
        $this->actingAs($adminUser, 'sanctum');
        $response = $this->getJson('/api/organization/users');
        $response->assertStatus(200);
        $emails = collect($response->json())->pluck('email');
        $this->assertFalse($emails->contains('techknowyourmail@gmail.com'));

        // --- TEST 4: prevent other users from deleting root user ---
        $response = $this->deleteJson('/api/organization/users/' . $rootUser->id);
        $response->assertStatus(403);
    }
}
