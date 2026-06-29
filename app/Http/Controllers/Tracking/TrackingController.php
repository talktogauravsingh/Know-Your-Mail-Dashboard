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
}
