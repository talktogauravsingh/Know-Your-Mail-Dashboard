<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class BulkRecipientTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(RbacSeeder::class);
    }

    public function test_can_bulk_upload_recipients()
    {
        Storage::fake('local');
        
        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $csvContent = "email,name,phone,gender,age,city,source\n";
        $csvContent .= "test1@example.com,Test One,1234567890,male,30,NYC,import\n";
        $csvContent .= "test2@example.com,Test Two,0987654321,female,25,LA,import\n";

        $file = UploadedFile::fake()->create('recipients.csv', $csvContent, 'text/csv');

        $response = $this->post('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(202)
                 ->assertJsonPath('success', true)
                 ->assertJsonStructure(['details']);
    }

    public function test_requires_file_for_bulk_upload()
    {
        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/recipients/bulk-upload');

        $response->assertStatus(422)
                 ->assertJsonValidationErrors('file');
    }

    public function test_file_must_be_csv_for_bulk_upload()
    {
        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $file = UploadedFile::fake()->create('test.pdf', 'not csv', 'application/pdf');

        $response = $this->postJson('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors('file');
    }

    public function test_unauthenticated_user_cannot_bulk_upload()
    {
        $csvContent = "email,name\n";
        $csvContent .= "test@example.com,Test\n";

        $file = UploadedFile::fake()->create('test.csv', $csvContent, 'text/csv');

        $response = $this->postJson('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(401);
    }
}

