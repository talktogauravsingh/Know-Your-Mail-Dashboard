<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Database\Seeders\RbacSeeder;

class InputValidationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $org;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(RbacSeeder::class);

        $this->org = Organization::create(['name' => 'Test Org']);
        $role = Role::where('slug', 'super-admin')->first() ?? Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
        $this->user = User::factory()->create([
            'email' => 'validationtestuser@example.com',
            'organization_id' => $this->org->id,
            'role_id' => $role->id,
        ]);
        
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_campaign_creation_rejects_special_characters_in_name()
    {
        $response = $this->postJson('/api/campaigns', [
            'name' => 'Campaign with special chars @#$',
            'subject' => 'Subject is ok with chars @#$',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }

    public function test_campaign_creation_accepts_valid_names()
    {
        $response = $this->postJson('/api/campaigns', [
            'name' => 'Valid Campaign Name 123_-',
            'subject' => 'Subject',
            'body' => 'Body',
        ]);

        $response->assertStatus(201);
    }

    public function test_user_registration_rejects_special_characters_in_name_and_org()
    {
        // Name with special character
        $response1 = $this->postJson('/api/auth/register', [
            'name' => 'User @ Name',
            'email' => 'testreg1@example.com',
            'phone_number' => '1234567890',
            'organization_type' => 'marketing',
            'organization_name' => 'Acme Org',
            'password' => 'password',
            'password_confirmation' => 'password',
            'otp' => '123456',
        ]);

        $response1->assertStatus(422)
                  ->assertJsonValidationErrors(['name']);

        // Org name with special character
        $response2 = $this->postJson('/api/auth/register', [
            'name' => 'User Name',
            'email' => 'testreg2@example.com',
            'phone_number' => '1234567890',
            'organization_type' => 'marketing',
            'organization_name' => 'Acme Org #1',
            'password' => 'password',
            'password_confirmation' => 'password',
            'otp' => '123456',
        ]);

        $response2->assertStatus(422)
                  ->assertJsonValidationErrors(['organization_name']);
    }

    public function test_team_member_invite_rejects_special_characters_in_name()
    {
        $role = Role::where('slug', 'manager')->first() ?? Role::factory()->create(['slug' => 'manager']);

        $response = $this->postJson('/api/organization/users', [
            'name' => 'Member Name @!',
            'email' => 'member@example.com',
            'password' => 'password',
            'role_id' => $role->id,
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }

    public function test_role_creation_rejects_special_characters_in_name()
    {
        // Authenticate as a user with view/manage roles permissions
        $admin = User::factory()->create(['organization_id' => $this->org->id]);
        $roleAdmin = Role::where('slug', 'super-admin')->first() ?? Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
        $admin->role_id = $roleAdmin->id;
        $admin->save();
        
        $this->actingAs($admin, 'sanctum');

        $response = $this->postJson('/api/roles', [
            'name' => 'Role Name @#',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);
    }
}
