<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;

class RoleTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RbacSeeder::class);
$this->manager = User::where('email', 'manager@example.com')->first();
    }

    public function test_can_list_roles()
    {
        $this->actingAs($this->manager, 'sanctum');

        $response = $this->getJson('/api/roles');

        $response->assertStatus(200);
    }

    public function test_can_create_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $response = $this->postJson('/api/roles', [
            'name' => 'Test Role'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('roles', ['name' => 'Test Role']);
    }

    public function test_can_update_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $role = Role::factory()->create(['name' => 'Old Name']);

        $response = $this->putJson('/api/roles/' . $role->id, [
            'name' => 'New Name'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'New Name']);
    }

    public function test_can_delete_role()
    {
        $this->actingAs($this->manager, 'sanctum');

        $role = Role::factory()->create();

        $response = $this->deleteJson('/api/roles/' . $role->id);

        $response->assertStatus(204);
$this->assertDatabaseHas('roles', ['id' => $role->id, 'status' => 0]);
    }

    public function test_requires_permission_for_crud_operations()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/roles');

        $response->assertStatus(403);
    }
}

