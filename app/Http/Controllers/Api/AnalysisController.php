<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Recipient;
use App\Models\SendLog;
use App\Models\User;
use App\Models\Conversion;
use App\Http\Services\Tracking\TrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalysisController extends Controller
{
    protected $trackingService;

    public function __construct(TrackingService $trackingService)
    {
        $this->trackingService = $trackingService;
    }

    public function hierarchical(Request $request)
    {
        $user = $request->user();

        $subordinateIds = $user->getSubordinateIds();
        $users = User::whereIn('id', $subordinateIds)
            ->select('id', 'name', 'email', 'role_id')
            ->get();

        $userStats = $users->map(function ($u) {
            $recipients = Recipient::forUserHierarchy($u);
            $sendLogs = SendLog::forUserHierarchy($u);
            
            $sentCount = $sendLogs->count();
            $openedCount = $sendLogs->whereNotNull('opened_at')->count();
            $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 2) : 0;
            
            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'recipients_count' => $recipients->count(),
                'sent_count' => $sentCount,
                'opened_count' => $openedCount,
                'open_rate' => $openRate,
            ];
        });

        $totals = [
            'recipients_total' => Recipient::forUserHierarchy($user)->count(),
            'sent_total' => SendLog::forUserHierarchy($user)->count(),
            'opened_total' => SendLog::forUserHierarchy($user)->whereNotNull('opened_at')->count(),
        ];

        return response()->json([
            'users' => $userStats,
            'totals' => $totals,
        ]);
    }

    public function campaignAnalysis(Request $request, int $id)
    {
        $user = $request->user();
        $campaign = Campaign::forUser($user)->findOrFail($id);

        $sendLogs = SendLog::where('campaign_id', $id);

        $sentCount = (clone $sendLogs)->count();
        $openedCount = (clone $sendLogs)->whereNotNull('opened_at')->count();
        $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 2) : 0;

        $deliveredCount = (clone $sendLogs)->whereNotNull('delivered_at')->count();
        $clicksTotal = (clone $sendLogs)->sum('clicks_count');
        $bounceCount = (clone $sendLogs)->where('bounce_type', '!=', 'none')->count();
        $bounceRate = $sentCount > 0 ? round(($bounceCount / $sentCount) * 100, 2) : 0;
        $deliveryRate = $sentCount > 0 ? round(($deliveredCount / $sentCount) * 100, 2) : 0;
        $clickRate = $sentCount > 0 ? round(($clicksTotal / $sentCount) * 100, 2) : 0;

        $regionBreakdown = (clone $sendLogs)
            ->whereNotNull('region')
            ->groupBy('region')
            ->select('region', DB::raw('count(*) as value'))
            ->get()
            ->map(fn($item) => ['name' => $item->region, 'value' => $item->value]);

        // Hourly Opens
        $hourlyOpens = [];
        $startTime = $campaign->created_at;
        $endTime = $startTime->copy()->addHours(10);
        
        $openedAtList = (clone $sendLogs)
            ->whereBetween('opened_at', [$startTime, $endTime])
            ->pluck('opened_at')
            ->map(function($date) {
                return \Carbon\Carbon::parse($date);
            });

        for ($i = 0; $i < 10; $i++) {
            $time = $startTime->copy()->addHours($i);
            $nextTime = $time->copy()->addHour();
            
            $count = $openedAtList->filter(function($openedAt) use ($time, $nextTime) {
                return $openedAt->between($time, $nextTime);
            })->count();
            
            $hourlyOpens[] = ['time' => $time->format('H:i'), 'opens' => $count];
        }

        // Recipients sample
        $recipientList = (clone $sendLogs)
            ->with('recipient')
            ->latest()
            ->take(20)
            ->get()
            ->map(fn($log) => [
                'id' => $log->id,
                'email' => $log->recipient ? $log->recipient->email : 'Unknown',
                'status' => ucfirst($log->status),
                'openCount' => $log->opened_at ? 1 : 0,
                'clickCount' => (int)$log->clicks_count,
                'location' => $log->region ?? 'Unknown',
                'device' => 'Desktop/Chrome',
                'lastActivity' => $log->updated_at->diffForHumans()
            ]);

        return response()->json([
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'subject' => $campaign->subject,
                'status' => ucfirst($campaign->status),
                'created_at' => $campaign->created_at->format('M d, Y \a\t h:i A')
            ],
            'summary' => [
                'sent' => $sentCount,
                'delivered' => $deliveredCount,
                'opened' => $openedCount,
                'clicked' => (int)$clicksTotal,
                'bounced' => $bounceCount,
            ],
            'rates' => [
                'delivery' => $deliveryRate,
                'open' => $openRate,
                'click' => $clickRate,
                'bounce' => $bounceRate,
            ],
            'hourlyOpens' => $hourlyOpens,
            'regionBreakdown' => $regionBreakdown,
            'recipients' => $recipientList,
            'linkPerformance' => [
                ['url' => $campaign->cta_url ?? 'https://example.com/main', 'clicks' => (int)$clicksTotal]
            ]
        ]);
    }

    /**
     * Track email event (sent, delivered, open, click, bounce)
     */
    public function trackEvent(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermission('track_events')) {
            abort(403, 'Insufficient permissions');
        }

        $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'email' => 'required|email',
            'event' => 'required|in:sent,delivered,open,click,bounce',
            'bounce_type' => 'nullable|in:hard,soft',
        ]);

        $campaign = Campaign::forUser($user)->findOrFail($request->campaign_id);
        $sendLog = SendLog::where('campaign_id', $request->campaign_id)
            ->where('email', $request->email)
            ->forUserHierarchy($user)
            ->first();

        if (!$sendLog) {
            return response()->json(['error' => 'SendLog not found'], 404);
        }

        DB::transaction(function () use ($sendLog, $request) {
            switch ($request->event) {
                case 'sent':
                    $sendLog->update(['sent_at' => now(), 'status' => 'sent']);
                    break;
                case 'delivered':
                    $sendLog->update(['delivered_at' => now(), 'status' => 'delivered']);
                    break;
                case 'open':
                    if (!$sendLog->opened_at) {
                        $sendLog->update(['opened_at' => now()]);
                    }
                    break;
                case 'click':
                    $sendLog->increment('clicks_count');
                    break;
                case 'bounce':
                    $type = $request->bounce_type ?? 'hard';
                    $sendLog->update([
                        'bounce_type' => $type,
                        'bounce_count' => $sendLog->bounce_count + 1,
                        'status' => 'bounced'
                    ]);
                    break;
            }
            $this->trackingService->logTracking($sendLog, $request, $request->event);
        });

        // Current stats
        $stats = [
            'sent_count' => SendLog::where('campaign_id', $request->campaign_id)->count(),
            'delivered_count' => SendLog::where('campaign_id', $request->campaign_id)->whereNotNull('delivered_at')->count(),
            'open_rate' => '...', // simplified
            'bounce_rate' => '...',
        ];

        return response()->json([
            'success' => true,
            'message' => 'Event tracked',
            'stats' => $stats
        ]);
    }

    /**
     * Record conversion (like Meta purchase event)
     */
    public function recordConversion(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermission('track_conversions')) {
            abort(403, 'Insufficient permissions');
        }

        $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'email' => 'required|email',
            'value' => 'required|numeric|min:0',
            'currency' => 'string|max:3|default:USD',
            'metadata' => 'nullable|array',
        ]);

        $campaign = Campaign::forUser($user)->findOrFail($request->campaign_id);

        Conversion::create([
            'campaign_id' => $request->campaign_id,
            'email' => $request->email,
            'value' => $request->value,
            'currency' => $request->currency ?? 'USD',
            'metadata' => $request->metadata,
        ]);

        $convs = Conversion::where('campaign_id', $request->campaign_id)->forUserHierarchy($user);
        return response()->json([
            'success' => true,
            'total_conversions' => $convs->count(),
            'total_value' => $convs->sum('value'),
        ]);
    }

    public function templateAnalysis(Request $request, int $id)
    {
        return $this->campaignAnalysis($request, $id);
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();
        
        // Base query for current user's organization
        $sendLogs = SendLog::whereHas('campaign', function($q) use ($user) {
            $q->where('organization_id', $user->organization_id);
        });
        
        $sentCount = (clone $sendLogs)->count();
        $deliveredCount = (clone $sendLogs)->whereNotNull('delivered_at')->count();
        $openedCount = (clone $sendLogs)->whereNotNull('opened_at')->count();
        $clicksTotal = (clone $sendLogs)->sum('clicks_count');
        $bounceCount = (clone $sendLogs)->where('bounce_type', '!=', 'none')->count();
        
        $deliveryRate = $sentCount > 0 ? round(($deliveredCount / $sentCount) * 100, 1) : 0;
        $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 1) : 0;
        $clickRate = $sentCount > 0 ? round(($clicksTotal / $sentCount) * 100, 1) : 0;
        $bounceRate = $sentCount > 0 ? round(($bounceCount / $sentCount) * 100, 1) : 0;

        // Trends (last 7 days)
        $trends = [];
        $startDate = now()->subDays(6)->startOfDay();
        $dateStrings = [];
        for ($i = 6; $i >= 0; $i--) {
            $dateStrings[] = now()->subDays($i)->format('Y-m-d');
        }
        
        $trendData = SendLog::whereHas('campaign', function($q) use ($user) {
                $q->where('organization_id', $user->organization_id);
            })
            ->where('sent_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(sent_at) as sent_date'),
                DB::raw('COUNT(*) as total_sent'),
                DB::raw('COUNT(opened_at) as total_opened')
            )
            ->groupBy(DB::raw('DATE(sent_at)'))
            ->get()
            ->keyBy('sent_date');

        foreach ($dateStrings as $dateStr) {
            $dayData = $trendData->get($dateStr);
            $daySent = $dayData ? $dayData->total_sent : 0;
            $dayOpened = $dayData ? $dayData->total_opened : 0;
            $dayOpenRate = $daySent > 0 ? round(($dayOpened / $daySent) * 100, 1) : 0;
            
            $trends[] = [
                'date' => \Carbon\Carbon::parse($dateStr)->format('D'),
                'openRate' => $dayOpenRate
            ];
        }

        // Top Campaigns
        $topCampaigns = Campaign::forUser($user)
            ->withSum('sendLogs as clicks', 'clicks_count')
            ->orderBy('clicks', 'desc')
            ->take(5)
            ->get()
            ->map(fn($c) => [
                'name' => $c->name, 
                'clicks' => (int)($c->clicks ?? 0)
            ]);

        // Device stats (mocked as tracking doesn't capture user agent yet)
        $devices = [
            ['name' => 'Desktop', 'value' => 65],
            ['name' => 'Mobile', 'value' => 25],
            ['name' => 'Tablet', 'value' => 8],
            ['name' => 'Other', 'value' => 2],
        ];

        return response()->json([
            'kpis' => [
                ['name' => 'Total Emails Sent', 'value' => number_format($sentCount), 'change' => '+0%', 'trend' => 'up'],
                ['name' => 'Delivery Rate', 'value' => $deliveryRate . '%', 'change' => '+0%', 'trend' => 'up'],
                ['name' => 'Open Rate', 'value' => $openRate . '%', 'change' => '+0%', 'trend' => 'up'],
                ['name' => 'Click Rate (CTR)', 'value' => $clickRate . '%', 'change' => '+0%', 'trend' => 'up'],
                ['name' => 'Bounce Rate', 'value' => $bounceRate . '%', 'change' => '+0%', 'trend' => 'down'],
                ['name' => 'Unsubscribe', 'value' => '0%', 'change' => '+0%', 'trend' => 'up'],
            ],
            'openRateTrend' => $trends,
            'topCampaigns' => $topCampaigns,
            'devices' => $devices
        ]);
    }
}

