<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;

class ManagerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RbacSeeder::class);
    }

    public function test_manager_creation()
    {
        $user = User::where('email', 'manager@example.com')->first();
        $this->actingAs($user, 'sanctum');
        $role = Role::where('slug', 'manager')->first();

$response = $this->postJson('/api/managers', [
            'name' => 'New Manager',
            'email' => 'newmanager@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => $role->id,
        ]);

$response->assertStatus(200)
            ->assertJsonStructure([
                'manager' => [
                    'id',
                    'name',
                    'email',
                    'role',
                ],
                'token'
            ]);
    }
}
