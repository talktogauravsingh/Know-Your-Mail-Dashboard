<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class TrackingTest extends TestCase
{
    public function test_open_mail_tracking()
    {
        $response = $this->get('/api/o/123');

        $response->assertStatus(200)
                 ->assertHeader('Content-Type', 'image/png')
                 ->assertHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
                 ->assertHeader('Pragma', 'no-cache')
                 ->assertHeader('Expires', '0');
    }
}

