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

    public function test_can_send_otp()
    {
        $response = $this->postJson('/api/auth/send-otp', [
            'name' => 'Test OTP User',
            'email' => 'sendotp@example.com',
            'phone_number' => '1234567890'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'OTP sent successfully to your email.');

        $this->assertNotNull(\Illuminate\Support\Facades\Cache::get('signup_otp_sendotp@example.com'));
    }

    public function test_can_register_user()
    {
        $email = 'newuser@example.com';
        $otp = '123456';
        \Illuminate\Support\Facades\Cache::put('signup_otp_' . $email, $otp, 600);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'otp' => $otp,
            'phone_number' => '1234567890',
            'organization_type' => 'marketing',
            'organization_name' => 'Acme Agency'
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'user' => ['id', 'name', 'email', 'role'],
                     'token'
                 ])
                 ->assertJsonPath('user.email', 'newuser@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'phone_number' => '1234567890'
        ]);
        
        $this->assertDatabaseHas('organizations', [
            'name' => 'Acme Agency'
        ]);
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
    public function test_returns_error_on_invalid_login()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'invalid@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401)
                 ->assertJsonPath('message', 'Invalid credentials');
    }

    /** @test */
    public function test_can_logout_authenticated_user()
    {
        $user = User::factory()->create();

        $token = $user->createToken('auth-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/auth/logout');

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Logged out successfully');
    }

    /** @test */
    public function test_can_send_forgot_password_link()
    {
        User::factory()->create(['email' => 'testforgot@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'testforgot@example.com',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Reset link sent to email');
    }

    /** @test */
    public function test_can_reset_password()
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);

        $token = Password::createToken($user);

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
    public function test_manager_with_permission_can_create_manager()
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

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'manager' => ['id', 'name', 'email', 'role'],
                     'token'
                 ]);
    }

    /** @test */
    public function test_user_without_permission_cannot_create_manager()
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

    /** @test */
    public function test_rejects_send_otp_with_invalid_special_characters_in_name_or_phone()
    {
        $response = $this->postJson('/api/auth/send-otp', [
            'name' => 'John @ Doe',
            'email' => 'sendotp_invalid@example.com',
            'phone_number' => '1234567890'
        ]);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);

        $response = $this->postJson('/api/auth/send-otp', [
            'name' => 'John Doe',
            'email' => 'sendotp_invalid@example.com',
            'phone_number' => '123-abc-7890'
        ]);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['phone_number']);
    }

    /** @test */
    public function test_rejects_registration_with_invalid_special_characters()
    {
        $email = 'newuser_invalid@example.com';
        $otp = '123456';
        \Illuminate\Support\Facades\Cache::put('signup_otp_' . $email, $otp, 600);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User @#$',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'otp' => $otp,
            'phone_number' => '1234567890',
            'organization_type' => 'marketing',
            'organization_name' => 'Acme Agency'
        ]);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['name']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'otp' => $otp,
            'phone_number' => '1234567890',
            'organization_type' => 'marketing',
            'organization_name' => 'Acme Agency @#$'
        ]);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['organization_name']);
    }
}

