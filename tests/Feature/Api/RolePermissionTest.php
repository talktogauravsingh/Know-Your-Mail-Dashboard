<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RbacSeeder::class);
        $this->manager = User::where('email', 'test@example.com')->first();
    }

    public function test_can_list_permissions_for_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $role = Role::factory()->create();
        $response = $this->getJson('/api/roles/' . $role->id . '/permissions');

        $response->assertStatus(200);
    }

    public function test_can_attach_permissions_to_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $role = Role::factory()->create();
        $permission = Permission::factory()->create();

        $response = $this->postJson('/api/roles/' . $role->id . '/permissions', [
            'permission_ids' => [$permission->id]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('role_permissions', [
            'role_id' => $role->id,
            'permission_id' => $permission->id
        ]);
    }

    public function test_can_detach_permissions_from_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $role = Role::factory()->create();
        $permission = Permission::factory()->create();
        $role->permissions()->attach($permission->id);

        $response = $this->deleteJson('/api/roles/' . $role->id . '/permissions', [
            'permission_ids' => [$permission->id]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('role_permissions', [
            'role_id' => $role->id,
            'permission_id' => $permission->id
        ]);
    }
}

