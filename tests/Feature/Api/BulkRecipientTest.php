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
                 ->assertJsonPath('success', true);
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

        // Since mimes:csv,txt is verified, let's upload a PDF to trigger the validation error
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

    public function test_prevents_duplicate_recipients_with_plus_suffix_within_csv()
    {
        Storage::fake('local');

        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $csvContent = "email,name,phone,gender,age,city,source\n";
        $csvContent .= "john@example.com,John Doe,1234567890,male,30,NYC,import\n";
        $csvContent .= "john+1@example.com,John Alias,1234567890,male,30,NYC,import\n";

        $file = UploadedFile::fake()->create('recipients.csv', $csvContent, 'text/csv');

        $response = $this->postJson('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(202)
                 ->assertJsonPath('success', true)
                 ->assertJsonPath('total_rows', 1)
                 ->assertJsonPath('valid_rows', 1);

        // Verify in the database that only 1 record exists and it's john@example.com
        $this->assertDatabaseHas('recipients', [
            'email' => 'john@example.com',
            'agent_id' => $user->id
        ]);
        $this->assertDatabaseMissing('recipients', [
            'email' => 'john+1@example.com'
        ]);
    }

    public function test_prevents_duplicate_recipients_with_plus_suffix_against_db()
    {
        Storage::fake('local');

        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        // Seed an existing recipient in DB
        \App\Models\Recipient::create([
            'email' => 'john@example.com',
            'name' => 'John Doe',
            'phone' => '1234567890',
            'agent_id' => $user->id,
            'organization_id' => $user->organization_id,
            'module_type' => 1,
            'module_id' => $user->organization_id,
            'is_valid' => true
        ]);

        $csvContent = "email,name,phone,gender,age,city,source\n";
        $csvContent .= "john+1@example.com,John Alias,1234567890,male,30,NYC,import\n";

        $file = UploadedFile::fake()->create('recipients.csv', $csvContent, 'text/csv');

        $response = $this->postJson('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(202)
                 ->assertJsonPath('success', true)
                 ->assertJsonPath('total_rows', 1)
                 ->assertJsonPath('valid_rows', 1);

        // Verify the database has only 1 recipient (no new recipient created, just upserted/updated)
        $this->assertDatabaseHas('recipients', [
            'email' => 'john@example.com',
            'agent_id' => $user->id
        ]);
        $this->assertDatabaseMissing('recipients', [
            'email' => 'john+1@example.com'
        ]);
    }

    public function test_rejects_recipient_upload_with_invalid_special_characters()
    {
        Storage::fake('local');

        $user = User::where('email', 'test@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $csvContent = "email,name,phone,gender,age,city,source\n";
        $csvContent .= "john@example.com,John @ Doe,1234567890,male,30,NYC,import\n"; // Invalid name (@)
        $csvContent .= "mary@example.com,Mary,123-abc-7890,female,25,LA,import\n"; // Invalid phone (letters)

        $file = UploadedFile::fake()->create('recipients.csv', $csvContent, 'text/csv');

        $response = $this->postJson('/api/recipients/bulk-upload', [
            'file' => $file,
        ]);

        $response->assertStatus(202)
                 ->assertJsonPath('success', true)
                 ->assertJsonPath('total_rows', 2)
                 ->assertJsonPath('valid_rows', 0)
                 ->assertJsonPath('invalid_rows', 2);

        // Verify that neither of the recipients is created in the database
        $this->assertDatabaseMissing('recipients', [
            'email' => 'john@example.com'
        ]);
        $this->assertDatabaseMissing('recipients', [
            'email' => 'mary@example.com'
        ]);
    }
}

