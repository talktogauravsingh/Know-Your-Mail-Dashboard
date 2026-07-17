<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $org;
    protected $adminRole;
    protected $managerRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->artisan('billing:sync-plans');

        $this->org = Organization::create(['name' => 'Test Org']);
        
        $this->adminRole = Role::where('slug', 'super-admin')->first();
        $this->managerRole = Role::where('slug', 'manager')->first();

        $this->user = User::factory()->create([
            'email' => 'usermgmtadmin@example.com',
            'organization_id' => $this->org->id,
            'role_id' => $this->adminRole->id,
        ]);
        
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_user_can_update_own_profile()
    {
        $response = $this->putJson('/api/user', [
            'name' => 'New Name',
            'email' => 'newemail@example.com',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('name', 'New Name')
                 ->assertJsonPath('email', 'newemail@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'New Name',
            'email' => 'newemail@example.com',
        ]);
    }

    public function test_super_admin_can_update_other_user()
    {
        $otherUser = User::factory()->create([
            'email' => 'otheruser@example.com',
            'organization_id' => $this->org->id,
            'role_id' => $this->managerRole->id,
        ]);

        $response = $this->putJson('/api/organization/users/' . $otherUser->id, [
            'name' => 'Updated User Name',
            'email' => 'updatedemail@example.com',
            'role_id' => $this->managerRole->id,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('name', 'Updated User Name')
                 ->assertJsonPath('email', 'updatedemail@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $otherUser->id,
            'name' => 'Updated User Name',
            'email' => 'updatedemail@example.com',
        ]);
    }
}
