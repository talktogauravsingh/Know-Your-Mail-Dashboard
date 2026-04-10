<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Permission;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;

class PermissionTest extends TestCase
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

    public function test_can_list_permissions()
    {
        $this->actingAs($this->manager, 'sanctum');

        $response = $this->getJson('/api/permissions');

        $response->assertStatus(200);
    }

    public function test_can_create_permission()
    {
        $this->actingAs($this->manager, 'sanctum');

        $response = $this->postJson('/api/permissions', [
            'name' => 'Test Permission'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('permissions', ['name' => 'Test Permission']);
    }

    public function test_can_update_permission()
    {
        $this->actingAs($this->manager, 'sanctum');

        $permission = Permission::factory()->create(['name' => 'Old Permission']);

        $response = $this->putJson('/api/permissions/' . $permission->id, [
            'name' => 'New Permission'
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('permissions', ['id' => $permission->id, 'name' => 'New Permission']);
    }

    public function test_can_delete_permission()
    {
        $this->actingAs($this->manager, 'sanctum');

        $permission = Permission::factory()->create();

        $response = $this->deleteJson('/api/permissions/' . $permission->id);

        $response->assertStatus(204);
$this->assertDatabaseHas('permissions', ['id' => $permission->id, 'status' => 0]);
    }

    public function test_requires_authentication()
    {
        $response = $this->getJson('/api/permissions');

        $response->assertStatus(401);
    }
}

