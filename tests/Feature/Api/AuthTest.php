<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Support\Facades\Notification;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RbacSeeder::class);
    }

public function test_can_register_user()
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'newuser@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

$response->assertStatus(200)
                 ->assertJsonStructure([
                     'user' => ['id', 'name', 'email', 'role'],
                     'token'
                 ])
                 ->assertJsonPath('user.email', 'newuser@example.com');

        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
    }

    public function test_can_login_user()
    {
        $user = User::factory()->create([
            'email' => 'testlogin@example.com',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'testlogin@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'user' => ['id', 'name', 'email'],
                     'token'
                 ]);
    }

    /** @test */
    public function it_returns_error_on_invalid_login()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'invalid@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401)
                 ->assertJsonPath('message', 'Invalid credentials');
    }

    /** @test */
    public function it_can_logout_authenticated_user()
    {
        $user = User::factory()->create();

        $token = $user->createToken('auth-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/auth/logout');

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Logged out successfully');
    }

    /** @test */
    public function it_can_send_forgot_password_link()
    {
        User::factory()->create(['email' => 'test@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Reset link sent to email');
    }

    /** @test */
    public function it_can_reset_password()
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);

        $status = Password::sendResetLink(['email' => 'reset@example.com']);

        $this->assertTrue($status === Password::RESET_LINK_SENT);

        $token = DB::table('password_reset_tokens')->where('email', 'reset@example.com')->first()->token;

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Password reset successfully');
    }

    /** @test */
    public function manager_with_permission_can_create_manager()
    {
        $manager = User::where('email', 'test@example.com')->first();
        if (!$manager) {
            $manager = User::factory()->create([
                'email' => 'test@example.com',
            ]);
        }
        $this->actingAs($manager, 'sanctum');
        $role = Role::where('slug', 'manager')->first() ?? Role::factory()->create(['slug' => 'manager']);

        $response = $this->postJson('/api/managers', [
            'name' => 'New Manager',
            'email' => 'newmanager@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => $role->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'manager' => ['id', 'name', 'email', 'role'],
                     'token'
                 ]);
    }

    /** @test */
    public function user_without_permission_cannot_create_manager()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/managers', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role_id' => 1,
        ]);

        $response->assertStatus(403);
    }
}

