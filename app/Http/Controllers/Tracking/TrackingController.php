<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Http\Services\Tracking\TrackingService;
use App\Models\SendLog;
use App\Jobs\EnrichTrackingDataJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class TrackingController extends Controller
{

    public $trackingService;

    public function __construct(TrackingService $trackingService)
    {
        $this->trackingService = $trackingService;
    }

    public function OpenMailTrack(Request $request)
    {
        try {
            $sendLog = SendLog::find($request->route('sendLog'));

            if ($sendLog) {
                $classification = $this->trackingService->classifyRequest(
                    $request->header('User-Agent', ''),
                    $request->ip()
                );

                $sentAt = $sendLog->sent_at;
                $isWithinPrefetchWindow = $sentAt && Carbon::parse($sentAt)->diffInSeconds(Carbon::now()) < 15;

                // Treat proxy prefetch requests as real human opens only if they occur after the initial 15-second prefetch window.
                if ($classification === 'human_open' || ($classification === 'proxy_prefetch' && !$isWithinPrefetchWindow)) {
                    $updateData = ['last_activity_at' => Carbon::now()];
                    if (!$sendLog->opened_at) {
                        $updateData['opened_at'] = Carbon::now();
                    }
                    $sendLog->increment('opens_count');
                    $sendLog->update($updateData);

                    $this->trackingService->logTracking($sendLog, $request, 'open');
                    dispatch(new EnrichTrackingDataJob(
                        $sendLog->id,
                        $request->ip(),
                        $request->header('User-Agent', ''),
                        $request->header('Referer', '')
                    ));
                    \App\Jobs\EvaluateTriggerAutomationJob::dispatch($sendLog, 'open');
                } else {
                    Log::info("Campaign open ignored for sendLog {$sendLog->id} because it was classified as: {$classification} (prefetch window: yes)");
                }
            }
        } catch (\Exception $e) {
            Log::warning('Tracking open failed: ' . $e->getMessage());
        }
        
        $base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        
        $image = base64_decode($base64);
        
        return response($image, 200)
            ->header('Content-Type', 'image/png')
            ->header('Content-Length', strlen($image))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    public function ClickMailTrack(Request $request)
    {
        $url = $request->query('url');
        try {
            $sendLog = SendLog::find($request->route('sendLog'));

            if ($sendLog) {
                $updateData = ['last_activity_at' => now()];
                if (!$sendLog->clicked_at) {
                    $updateData['clicked_at'] = now();
                }
                $sendLog->increment('clicks_count');

                // Track click URL in tracking_data
                $url = $request->query('url');
                if ($url) {
                    $trackingData = $sendLog->tracking_data ?? [];
                    $clickedUrls = $trackingData['clicked_urls'] ?? [];
                    $clickedUrls[] = [
                        'url' => $url,
                        'clicked_at' => now()->toDateTimeString(),
                    ];
                    $trackingData['clicked_urls'] = $clickedUrls;
                    $updateData['tracking_data'] = $trackingData;
                }

                $sendLog->update($updateData);

                $this->trackingService->logTracking($sendLog, $request, 'click');
                dispatch(new EnrichTrackingDataJob(
                    $sendLog->id,
                    $request->ip(),
                    $request->header('User-Agent', ''),
                    $request->header('Referer', '')
                ));
                \App\Jobs\EvaluateTriggerAutomationJob::dispatch($sendLog, 'click', $url);
            }
        } catch (\Exception $e) {
            Log::warning('Tracking click failed: ' . $e->getMessage());
        }
        
        if ($url) {
            return redirect($url);
        }
        
        return response('', 204);
    }

    public function OpenRelayTrack(Request $request)
    {
        $recipientId = $request->route('recipientId');
        
        $base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        $image = base64_decode($base64);

        $uuidRegex = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
        if (!preg_match($uuidRegex, $recipientId)) {
            return response($image, 200)->header('Content-Type', 'image/png');
        }

        try {
            $recipient = \App\Models\MessageRecipient::with('message')->find($recipientId);
            if (!$recipient || !$recipient->message) {
                return response($image, 200)->header('Content-Type', 'image/png');
            }

            $classification = $this->trackingService->classifyRequest(
                $request->header('User-Agent', ''),
                $request->ip()
            );
            
            $sentAt = $recipient->sent_at;
            $isWithinPrefetchWindow = $sentAt && Carbon::parse($sentAt)->diffInSeconds(Carbon::now()) < 15;
            $isRealOpen = ($classification === 'human_open' || ($classification === 'proxy_prefetch' && !$isWithinPrefetchWindow)) ? 1 : 0;

            // Log event
            \App\Models\Event::create([
                'recipient_id' => $recipientId,
                'event_type' => 'opened',
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent', ''),
                'details' => [
                    'classification' => $classification,
                    'is_real_open' => $isRealOpen,
                ],
            ]);

            // Update aggregates in daily_analytics
            \Illuminate\Support\Facades\DB::insert(
                "INSERT INTO daily_analytics (organization_id, domain_id, date, open_count, real_open_count, created_at, updated_at)
                 VALUES (?, ?, CURRENT_DATE(), 1, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE 
                   open_count = open_count + 1,
                   real_open_count = real_open_count + ?,
                   updated_at = NOW()",
                [
                    $recipient->message->organization_id,
                    $recipient->message->domain_id,
                    $isRealOpen,
                    $isRealOpen
                ]
            );

            // Fire webhook event
            $this->trackingService->triggerRelayWebhook($recipientId, 'opened', [
                'recipient_id' => $recipientId,
                'message_id' => $recipient->message->id,
                'email' => $recipient->recipient_email,
                'event' => 'opened',
                'ip' => $request->ip(),
                'user_agent' => $request->header('User-Agent', ''),
                'classification' => $classification,
                'timestamp' => now()->toIso8601String(),
            ]);

        } catch (\Exception $e) {
            Log::warning('Relay open tracking failed: ' . $e->getMessage());
        }

        return response($image, 200)
            ->header('Content-Type', 'image/png')
            ->header('Content-Length', strlen($image))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    public function ClickRelayTrack(Request $request)
    {
        $linkId = $request->route('linkId');
        $recipientId = $request->route('recipientId');
        $defaultRedirectUrl = 'https://knowyourmail.com';

        $uuidRegex = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
        if (!preg_match($uuidRegex, $linkId) || !preg_match($uuidRegex, $recipientId)) {
            return redirect($defaultRedirectUrl);
        }

        try {
            $link = \App\Models\TrackedLink::find($linkId);
            $recipient = \App\Models\MessageRecipient::with('message')->find($recipientId);
            
            if (!$link || !$recipient || !$recipient->message) {
                return redirect($defaultRedirectUrl);
            }

            $originalUrl = $link->original_url;

            // Log event
            \App\Models\Event::create([
                'recipient_id' => $recipientId,
                'event_type' => 'clicked',
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent', ''),
                'details' => [
                    'link_id' => $linkId,
                    'url' => $originalUrl,
                ],
            ]);

            // Update aggregates in daily_analytics
            \Illuminate\Support\Facades\DB::insert(
                "INSERT INTO daily_analytics (organization_id, domain_id, date, click_count, created_at, updated_at)
                 VALUES (?, ?, CURRENT_DATE(), 1, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE 
                   click_count = click_count + 1,
                   updated_at = NOW()",
                [
                    $recipient->message->organization_id,
                    $recipient->message->domain_id
                ]
            );

            // Fire webhook event
            $this->trackingService->triggerRelayWebhook($recipientId, 'clicked', [
                'recipient_id' => $recipientId,
                'message_id' => $recipient->message->id,
                'email' => $recipient->recipient_email,
                'event' => 'clicked',
                'url' => $originalUrl,
                'ip' => $request->ip(),
                'user_agent' => $request->header('User-Agent', ''),
                'timestamp' => now()->toIso8601String(),
            ]);

            return redirect($originalUrl);

        } catch (\Exception $e) {
            Log::warning('Relay click tracking failed: ' . $e->getMessage());
            return redirect($defaultRedirectUrl);
        }
    }

    public function handleRelayEvent(Request $request)
    {
        $recipientId = $request->input('recipientId');
        $eventType = $request->input('eventType');
        $payload = $request->input('payload');

        if (!$recipientId || !$eventType || !$payload) {
            return response()->json(['error' => 'Missing required fields'], 400);
        }

        $this->trackingService->triggerRelayWebhook($recipientId, $eventType, $payload);

        return response()->json(['success' => true]);
    }
}
