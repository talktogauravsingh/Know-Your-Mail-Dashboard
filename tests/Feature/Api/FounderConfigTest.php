<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Api\FounderController;

class FounderConfigTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::forget('founder_system_configs');
        if (file_exists(storage_path('app/redis_connection.json'))) {
            unlink(storage_path('app/redis_connection.json'));
        }
    }

    protected function tearDown(): void
    {
        Cache::forget('founder_system_configs');
        if (file_exists(storage_path('app/redis_connection.json'))) {
            unlink(storage_path('app/redis_connection.json'));
        }
        parent::tearDown();
    }

    public function test_can_retrieve_empty_configs()
    {
        $response = $this->getJson('/api/founder/config');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'configs' => []
                 ]);
    }

    public function test_can_save_configuration()
    {
        $response = $this->postJson('/api/founder/config', [
            'key' => 'TEST_KEY_ONE',
            'value' => 'Hello World Value',
            'description' => 'Test Config Notes'
        ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => "Configuration 'TEST_KEY_ONE' saved successfully."
                 ]);

        // Check it exists in cache
        $cached = Cache::get('founder_system_configs');
        $this->assertArrayHasKey('TEST_KEY_ONE', $cached);
        $this->assertEquals('Hello World Value', $cached['TEST_KEY_ONE']['value']);
        $this->assertEquals('Test Config Notes', $cached['TEST_KEY_ONE']['description']);
    }

    public function test_can_retrieve_saved_configs()
    {
        // Setup cache
        Cache::forever('founder_system_configs', [
            'TEST_KEY_TWO' => [
                'value' => 'Another Value',
                'description' => 'Notes 2',
                'updated_at' => now()->toIso8601String()
            ]
        ]);

        $response = $this->getJson('/api/founder/config');

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'key' => 'TEST_KEY_TWO',
                     'value' => 'Another Value',
                     'description' => 'Notes 2'
                 ]);
    }

    public function test_can_delete_configuration()
    {
        // Setup cache
        Cache::forever('founder_system_configs', [
            'TEST_KEY_THREE' => [
                'value' => 'Value 3',
                'description' => 'Notes 3',
                'updated_at' => now()->toIso8601String()
            ]
        ]);

        $response = $this->deleteJson('/api/founder/config/TEST_KEY_THREE');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => "Configuration 'TEST_KEY_THREE' deleted successfully."
                 ]);

        $cached = Cache::get('founder_system_configs');
        $this->assertArrayNotHasKey('TEST_KEY_THREE', $cached);
    }

    public function test_can_refer_using_static_helper()
    {
        Cache::forever('founder_system_configs', [
            'DOCKER_NETWORK_TUNNEL' => [
                'value' => 'http://haraka:587',
                'description' => 'Internal route tunnel description',
                'updated_at' => now()->toIso8601String()
            ]
        ]);

        $value = FounderController::getSetting('DOCKER_NETWORK_TUNNEL');
        $this->assertEquals('http://haraka:587', $value);

        $nonExistent = FounderController::getSetting('NON_EXISTENT_VAL', 'default_fallback');
        $this->assertEquals('default_fallback', $nonExistent);
    }

    public function test_can_retrieve_redis_connection_details()
    {
        $response = $this->getJson('/api/founder/redis-connection');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'connection' => [
                         'host',
                         'port',
                         'password',
                         'configured'
                     ],
                     'status'
                 ]);
    }

    public function test_fails_to_save_invalid_redis_connection()
    {
        $response = $this->postJson('/api/founder/redis-connection', [
            'host' => 'invalid-host-name-should-fail-testing-auth',
            'port' => 6379,
            'password' => null
        ]);

        $response->assertStatus(422)
                 ->assertJson([
                     'success' => false
                 ]);

        $this->assertFalse(file_exists(storage_path('app/redis_connection.json')));
    }
}
