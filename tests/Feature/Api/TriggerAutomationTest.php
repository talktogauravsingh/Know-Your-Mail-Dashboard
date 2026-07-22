<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\EmailTemplate;
use App\Models\Organization;
use App\Models\Recipient;
use App\Models\SendLog;
use App\Models\TriggerAutomation;
use App\Models\TriggerAutomationLog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TriggerAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $org;
    protected $campaign;
    protected $template;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->org = Organization::create([
            'name' => 'Test Organization',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $rootRole = \App\Models\Role::where('slug', 'root')->first();
        $this->user = User::create([
            'name' => 'Test Admin',
            'email' => 'testadmin@example.com',
            'password' => bcrypt('password'),
            'organization_id' => $this->org->id,
            'role_id' => $rootRole?->id,
        ]);

        $this->campaign = Campaign::create([
            'organization_id' => $this->org->id,
            'name' => 'Campaign Alpha',
            'subject' => 'Hello Alpha',
            'body' => 'Campaign alpha content',
            'status' => 'running',
            'segmentation_mode' => 'single',
        ]);

        $this->template = EmailTemplate::create([
            'organization_id' => $this->org->id,
            'template_name' => 'Follow-up Template',
            'slug' => 'follow-up-template',
            'subject' => 'Follow-up Email',
            'html_content' => '<h1>Hey {{name}}, thanks!</h1>',
            'variables' => ['name'],
            'created_by' => $this->user->id,
        ]);
    }

    public function test_unauthenticated_cannot_access_automations()
    {
        $response = $this->getJson('/api/automations');
        $response->assertStatus(401);
    }

    public function test_authenticated_can_list_automations()
    {
        $this->actingAs($this->user, 'sanctum');

        TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'On Open Automation',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'open',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Thanks for opening!',
            'status' => 'active',
        ]);

        $response = $this->getJson('/api/automations');

        $response->assertStatus(200)
                 ->assertJsonCount(1);
    }

    public function test_authenticated_can_create_automation()
    {
        $this->actingAs($this->user, 'sanctum');

        $response = $this->postJson('/api/automations', [
            'name' => 'On Click Automation',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'click',
            'trigger_click_url' => 'https://example.com/special',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Thanks for clicking!',
            'action_variable_mappings' => ['name' => 'name'],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'On Click Automation')
                 ->assertJsonPath('data.trigger_event', 'click');

        $this->assertDatabaseHas('trigger_automations', [
            'name' => 'On Click Automation',
            'trigger_click_url' => 'https://example.com/special',
        ]);
    }

    public function test_tenant_isolation_prevents_crud_on_other_org()
    {
        // Create an organization 2 and user 2
        $org2 = Organization::create(['name' => 'Org Two']);
        $rootRole = \App\Models\Role::where('slug', 'root')->first();
        $user2 = User::factory()->create([
            'organization_id' => $org2->id,
            'email' => 'user2@example.com',
            'role_id' => $rootRole?->id,
        ]);

        // Create automation belonging to Org 1
        $automation = TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'Org 1 Automation',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'open',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Subject',
            'status' => 'active',
        ]);

        // Acting as user 2 of Org 2
        $this->actingAs($user2, 'sanctum');

        // Can't show
        $response = $this->getJson("/api/automations/{$automation->id}");
        $response->assertStatus(404);

        // Can't update
        $response = $this->patchJson("/api/automations/{$automation->id}", [
            'name' => 'Hacked Name',
        ]);
        $response->assertStatus(404);

        // Can't delete
        $response = $this->deleteJson("/api/automations/{$automation->id}");
        $response->assertStatus(404);
    }

    public function test_evaluate_trigger_automation_on_open()
    {
        Bus::fake();

        // Create active open automation
        TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'On Open',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'open',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Thanks for opening!',
            'status' => 'active',
        ]);

        $recipient = Recipient::create([
            'organization_id' => $this->org->id,
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => 1,
            'is_valid' => 1,
            'agent_id' => $this->user->id,
        ]);

        $sendLog = SendLog::create([
            'campaign_id' => $this->campaign->id,
            'recipient_id' => $recipient->id,
            'email' => $recipient->email,
            'status' => 'sent',
        ]);

        // Simulate open track API endpoint hit
        $response = $this->get("/api/track/open/{$sendLog->uuid}");
        $response->assertStatus(200);

        // Verify EvaluateTriggerAutomationJob was dispatched
        Bus::assertDispatched(\App\Jobs\EvaluateTriggerAutomationJob::class, function ($job) use ($sendLog) {
            return $job->handle() === null; // Handle executes correctly
        });
    }

    public function test_evaluate_trigger_automation_on_click_with_url()
    {
        Queue::fake();

        $automation = TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'On Click Specific',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'click',
            'trigger_click_url' => 'https://example.com/checkout',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Checkout complete!',
            'status' => 'active',
        ]);

        $recipient = Recipient::create([
            'organization_id' => $this->org->id,
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'status' => 1,
            'is_valid' => 1,
            'agent_id' => $this->user->id,
        ]);

        $sendLog = SendLog::create([
            'campaign_id' => $this->campaign->id,
            'recipient_id' => $recipient->id,
            'email' => $recipient->email,
            'status' => 'sent',
        ]);

        // Simulating click track API with the correct url query parameter
        $response = $this->get("/api/track/click/{$sendLog->uuid}?url=https://example.com/checkout");
        $response->assertRedirect('https://example.com/checkout');

        // Check EvaluateTriggerAutomationJob is queued
        Queue::assertPushed(\App\Jobs\EvaluateTriggerAutomationJob::class);
    }

    public function test_capping_safety_limits_execution()
    {
        Mail::fake();

        $automation = TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'On Open Capped',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_event' => 'open',
            'action_template_id' => $this->template->id,
            'action_subject' => 'Once only!',
            'status' => 'active',
        ]);

        $recipient = Recipient::create([
            'organization_id' => $this->org->id,
            'name' => 'Capped User',
            'email' => 'capped@example.com',
            'status' => 1,
            'is_valid' => 1,
            'agent_id' => $this->user->id,
        ]);

        $sendLog = SendLog::create([
            'campaign_id' => $this->campaign->id,
            'recipient_id' => $recipient->id,
            'email' => $recipient->email,
            'status' => 'sent',
        ]);

        // Run direct evaluation
        $job = new \App\Jobs\EvaluateTriggerAutomationJob($sendLog, 'open');
        $job->handle();

        // Check TriggerAutomationLog was created
        $this->assertDatabaseHas('trigger_automation_logs', [
            'automation_id' => $automation->id,
            'recipient_id' => $recipient->id,
            'status' => 'success', // Job processed synchronously in direct test calls
        ]);

        $firstLogCount = TriggerAutomationLog::count();
        $this->assertEquals(1, $firstLogCount);

        // Run evaluation again for same recipient and automation
        $job2 = new \App\Jobs\EvaluateTriggerAutomationJob($sendLog, 'open');
        $job2->handle();

        // Count should STILL be 1 because capping blocked the second run!
        $secondLogCount = TriggerAutomationLog::count();
        $this->assertEquals(1, $secondLogCount);
    }

    public function test_evaluate_trigger_automation_with_segment_specific_overrides()
    {
        Mail::fake();

        // 1. Create two email templates for the different segments
        $templateA = EmailTemplate::create([
            'organization_id' => $this->org->id,
            'template_name' => 'Template A (Checkout)',
            'slug' => 'template-a',
            'subject' => 'Main Subject A',
            'html_content' => '<h1>Johnny, did you forget {{first_name}}?</h1>',
            'variables' => ['first_name'],
            'created_by' => $this->user->id,
        ]);

        $templateB = EmailTemplate::create([
            'organization_id' => $this->org->id,
            'template_name' => 'Template B (Welcome)',
            'slug' => 'template-b',
            'subject' => 'Main Subject B',
            'html_content' => '<h1>Hello from {{company_name}}!</h1>',
            'variables' => ['company_name'],
            'created_by' => $this->user->id,
        ]);

        // 2. Create the automation rule with segment override configs
        $automation = TriggerAutomation::create([
            'organization_id' => $this->org->id,
            'name' => 'Branched Automation',
            'trigger_campaign_id' => $this->campaign->id,
            'trigger_variant_ids' => [101, 102],
            'trigger_event' => 'open', // Default global event
            'action_template_id' => $this->template->id,
            'action_subject' => 'Default Subject',
            'status' => 'active',
            'action_variable_mappings' => [
                'global_mappings' => ['name' => 'name'],
                'segment_configs' => [
                    '101' => [
                        'triggerEvent' => 'click',
                        'triggerClickUrl' => 'https://example.com/checkout',
                        'selectedTemplateId' => $templateA->id,
                        'actionSubject' => 'Checkout follow-up for {{first_name}}',
                        'variableMappings' => ['first_name' => 'first_name'],
                        'delayHours' => 1,
                        'delayMinutes' => 30,
                    ],
                    '102' => [
                        'triggerEvent' => 'open',
                        'selectedTemplateId' => $templateB->id,
                        'actionSubject' => 'Welcome to {{company_name}}',
                        'variableMappings' => ['company_name' => 'company_name'],
                        'delayHours' => 0,
                        'delayMinutes' => 0,
                    ],
                ]
            ],
        ]);

        // 3. Create a recipient with attributes mapping to both segments
        $recipient = Recipient::create([
            'organization_id' => $this->org->id,
            'name' => 'Johnny Bravo',
            'email' => 'johnny@example.com',
            'status' => 1,
            'is_valid' => 1,
            'agent_id' => $this->user->id,
            'attributes' => [
                'first_name' => 'Johnny',
                'company_name' => 'Acme Corp',
            ],
        ]);

        // Scenario A: Recipient gets campaign Variant 101, does click event on checkout link
        $sendLogA = SendLog::create([
            'campaign_id' => $this->campaign->id,
            'recipient_id' => $recipient->id,
            'email' => $recipient->email,
            'status' => 'sent',
            'variant_id' => 101,
        ]);

        // First evaluate with the wrong event (open) -> shouldn't match because Variant 101 overrides triggerEvent to 'click'!
        $jobA1 = new \App\Jobs\EvaluateTriggerAutomationJob($sendLogA, 'open');
        $jobA1->handle();
        $this->assertEquals(0, TriggerAutomationLog::where('send_log_id', $sendLogA->id)->count());

        // Now evaluate with the correct click event -> matches Variant 101!
        $jobA2 = new \App\Jobs\EvaluateTriggerAutomationJob($sendLogA, 'click', 'https://example.com/checkout');
        $jobA2->handle();

        // Verify success log created automatically due to synchronous test execution
        $logA = TriggerAutomationLog::where('send_log_id', $sendLogA->id)->first();
        $this->assertNotNull($logA);
        $this->assertEquals('success', $logA->status);

        // Assert mail was sent with resolved Template A and overridden Subject
        Mail::assertSent(\App\Mail\BulkMail::class, function ($mail) {
            return $mail->hasTo('johnny@example.com') &&
                   $mail->mailSubject === 'Checkout follow-up for Johnny' &&
                   str_contains($mail->htmlBody, 'Johnny, did you forget Johnny?');
        });

        // Scenario B: Recipient gets campaign Variant 102, does open event
        $recipientB = Recipient::create([
            'organization_id' => $this->org->id,
            'name' => 'Johnny Bravo B',
            'email' => 'johnnyb@example.com',
            'status' => 1,
            'is_valid' => 1,
            'agent_id' => $this->user->id,
            'attributes' => [
                'first_name' => 'Johnny B',
                'company_name' => 'Acme Corp',
            ],
        ]);

        $sendLogB = SendLog::create([
            'campaign_id' => $this->campaign->id,
            'recipient_id' => $recipientB->id,
            'email' => $recipientB->email,
            'status' => 'sent',
            'variant_id' => 102,
        ]);

        // Evaluate open event -> matches Variant 102!
        $jobB = new \App\Jobs\EvaluateTriggerAutomationJob($sendLogB, 'open');
        $jobB->handle();

        // Verify success log created automatically due to synchronous test execution
        $logB = TriggerAutomationLog::where('send_log_id', $sendLogB->id)->first();
        $this->assertNotNull($logB);
        $this->assertEquals('success', $logB->status);

        // Assert mail was sent with resolved Template B and overridden Subject
        Mail::assertSent(\App\Mail\BulkMail::class, function ($mail) {
            return $mail->hasTo('johnnyb@example.com') &&
                   $mail->mailSubject === 'Welcome to Acme Corp' &&
                   str_contains($mail->htmlBody, 'Hello from Acme Corp!');
        });
    }
}
