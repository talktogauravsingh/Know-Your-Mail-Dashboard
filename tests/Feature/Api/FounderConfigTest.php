<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\SystemConfig;
use App\Http\Controllers\Api\FounderController;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FounderConfigTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SystemConfig::clearCache();
        if (file_exists(storage_path('app/redis_connection.json'))) {
            unlink(storage_path('app/redis_connection.json'));
        }
    }

    protected function tearDown(): void
    {
        SystemConfig::clearCache();
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
                     'message' => "Configuration 'TEST_KEY_ONE' saved successfully to database."
                 ]);

        // Check it exists in DB & model helper
        $this->assertDatabaseHas('system_configs', [
            'key' => 'TEST_KEY_ONE',
            'value' => 'Hello World Value',
            'description' => 'Test Config Notes',
        ]);
        $this->assertEquals('Hello World Value', SystemConfig::get('TEST_KEY_ONE'));
    }

    public function test_can_retrieve_saved_configs()
    {
        SystemConfig::set('TEST_KEY_TWO', 'Another Value', 'Notes 2');

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
        SystemConfig::set('TEST_KEY_THREE', 'Value 3', 'Notes 3');

        $response = $this->deleteJson('/api/founder/config/TEST_KEY_THREE');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => "Configuration 'TEST_KEY_THREE' deleted successfully."
                 ]);

        $this->assertDatabaseMissing('system_configs', ['key' => 'TEST_KEY_THREE']);
    }

    public function test_can_clear_config_cache()
    {
        SystemConfig::set('TEST_KEY_CACHE', 'Cache Value', 'Cache Notes');

        $response = $this->postJson('/api/founder/config/clear-cache');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'System configuration cache cleared successfully.'
                 ]);
    }

    public function test_can_refer_using_static_helper()
    {
        SystemConfig::set('DOCKER_NETWORK_TUNNEL', 'http://haraka:587', 'Internal route tunnel description');

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
}
