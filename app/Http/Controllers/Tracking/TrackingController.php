<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Http\Services\Tracking\TrackingService;
use App\Models\SendLog;
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

            if ($sendLog && !$sendLog->opened_at) {
                $sendLog->update(['opened_at' => Carbon::now()]);
                $this->trackingService->logTracking($sendLog, $request, 'open');
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
        try {
            $sendLog = SendLog::find($request->route('sendLog'));

            if ($sendLog) {
                $sendLog->increment('clicks_count');
                $sendLog->update(['last_activity_at' => now()]);
                $this->trackingService->logTracking($sendLog, $request, 'click');
            }
        } catch (\Exception $e) {
            Log::warning('Tracking click failed: ' . $e->getMessage());
        }
        
        $url = $request->query('url');
        if ($url) {
            return redirect($url);
        }
        
        return response('', 204);
    }
}
