<?php

namespace App\Jobs;

use App\Models\SendLog;
use App\Http\Services\Tracking\TrackingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Enriches a send-log's tracking_data with geo-location data asynchronously.
 *
 * This job is dispatched after the open/click pixel has already responded —
 * so ip-api.com latency never blocks the end-user's request.
 */
class EnrichTrackingDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10; // seconds between retries

    public function __construct(
        protected int    $sendLogId,
        protected string $ipAddress,
        protected string $userAgent,
        protected string $referrer,
    ) {}

    public function handle(TrackingService $trackingService): void
    {
        $sendLog = SendLog::find($this->sendLogId);

        if (!$sendLog) {
            return; // already gone — no point enriching
        }

        $region     = $trackingService->getRegion($this->ipAddress);
        $browser    = $trackingService->getBrowserName($this->userAgent);
        $os         = $trackingService->getOSName($this->userAgent);
        $deviceType = $trackingService->getDeviceType($this->userAgent);

        $sendLog->update([
            'region'        => $region,
            'tracking_data' => [
                'ip_address'  => $this->ipAddress,
                'region'      => $region,
                'browser'     => $browser,
                'os'          => $os,
                'device_type' => $deviceType,
                'user_agent'  => $this->userAgent,
                'referrer'    => $this->referrer,
            ],
        ]);

        Log::debug("EnrichTrackingDataJob: send_log #{$this->sendLogId} enriched with region={$region}");
    }

    public function failed(\Throwable $exception): void
    {
        Log::warning("EnrichTrackingDataJob failed for send_log #{$this->sendLogId}: " . $exception->getMessage());
    }
}
