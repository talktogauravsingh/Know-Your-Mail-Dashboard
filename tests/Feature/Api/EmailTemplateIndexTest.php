<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\EmailTemplate;

class EmailTemplateIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_organization_and_public_templates_only()
    {
        $organization = Organization::factory()->create();
        $otherOrganization = Organization::factory()->create();

        $user = User::factory()->create([
            'organization_id' => $organization->id,
        ]);

        EmailTemplate::create([
            'organization_id' => $organization->id,
            'template_name' => 'Org Template',
            'slug' => 'org-template',
            'category' => 'Newsletter',
            'subject' => 'Hello Org',
            'html_content' => '<p>Hello Org</p>',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'is_public' => false,
        ]);

        EmailTemplate::create([
            'organization_id' => $otherOrganization->id,
            'template_name' => 'Public Template',
            'slug' => 'public-template',
            'category' => 'Promotion',
            'subject' => 'Hello Public',
            'html_content' => '<p>Hello Public</p>',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'is_public' => true,
        ]);

        EmailTemplate::create([
            'organization_id' => $otherOrganization->id,
            'template_name' => 'Private Template',
            'slug' => 'private-template',
            'category' => 'Promotion',
            'subject' => 'Hello Private',
            'html_content' => '<p>Hello Private</p>',
            'created_by' => $user->id,
            'updated_by' => $user->id,
            'is_public' => false,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/email-templates');

        $response->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonFragment(['template_name' => 'Org Template'])
            ->assertJsonFragment(['template_name' => 'Public Template'])
            ->assertJsonMissing(['template_name' => 'Private Template']);
    }
}
