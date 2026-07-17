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

        // Self-healing check: if campaign is marked as running but has no pending logs, mark it completed.
        if (strtolower($campaign->status) === 'running') {
            $hasPending = SendLog::where('campaign_id', $id)->where('status', 'pending')->exists();
            if (!$hasPending) {
                $campaign->update(['status' => 'completed']);
                $campaign->status = 'completed';
            }
        }

        $sendLogs = SendLog::where('campaign_id', $id);

        $sentCount = (clone $sendLogs)->count();
        $deliveredCount = (clone $sendLogs)->whereNotNull('delivered_at')->count();
        $bounceCount = (clone $sendLogs)->where('bounce_type', '!=', 'none')->count();
        $unsubscribedCount = (clone $sendLogs)->where('status', 'unsubscribed')->count();

        // Unique & Total Opens
        $uniqueOpens = (clone $sendLogs)->whereNotNull('opened_at')->count();
        $totalOpens = (clone $sendLogs)->sum('opens_count');
        if ($totalOpens < $uniqueOpens) {
            $totalOpens = $uniqueOpens;
        }

        // Unique & Total Clicks
        $uniqueClicks = (clone $sendLogs)->whereNotNull('clicked_at')->count();
        $totalClicks = (clone $sendLogs)->sum('clicks_count');
        if ($totalClicks < $uniqueClicks) {
            $totalClicks = $uniqueClicks;
        }

        // Rates
        $deliveryRate = $sentCount > 0 ? round(($deliveredCount / $sentCount) * 100, 2) : 0;
        $openRate = $sentCount > 0 ? round(($uniqueOpens / $sentCount) * 100, 2) : 0;
        $clickRate = $sentCount > 0 ? round(($uniqueClicks / $sentCount) * 100, 2) : 0;
        $bounceRate = $sentCount > 0 ? round(($bounceCount / $sentCount) * 100, 2) : 0;
        $unsubscribeRate = $sentCount > 0 ? round(($unsubscribedCount / $sentCount) * 100, 2) : 0;
        $ctorRate = $uniqueOpens > 0 ? round(($uniqueClicks / $uniqueOpens) * 100, 2) : 0;
        $inboxPlacementRate = $sentCount > 0 ? max(0, round((($deliveredCount - $bounceCount) / $sentCount) * 98.5, 2)) : 0;

        // Region Breakdown
        $regionBreakdown = (clone $sendLogs)
            ->whereNotNull('region')
            ->groupBy('region')
            ->select('region', DB::raw('count(*) as value'))
            ->get()
            ->map(fn($item) => ['name' => $item->region, 'value' => $item->value]);

        // Device and Browser Breakdowns from tracking_data JSON
        $deviceBreakdown = ['Desktop' => 0, 'Mobile' => 0, 'Tablet' => 0, 'Unknown' => 0];
        $browserBreakdown = [];

        $logsWithTracking = (clone $sendLogs)->whereNotNull('tracking_data')->get(['tracking_data']);
        foreach ($logsWithTracking as $log) {
            $data = $log->tracking_data;
            if (is_array($data)) {
                $device = $data['device_type'] ?? 'Unknown';
                $browser = $data['browser'] ?? 'Unknown';

                $deviceBreakdown[$device] = ($deviceBreakdown[$device] ?? 0) + 1;
                $browserBreakdown[$browser] = ($browserBreakdown[$browser] ?? 0) + 1;
            }
        }

        $deviceBreakdownData = [];
        foreach ($deviceBreakdown as $name => $val) {
            if ($val > 0 || $name !== 'Unknown') {
                $deviceBreakdownData[] = ['name' => $name, 'value' => $val];
            }
        }

        $browserBreakdownData = [];
        foreach ($browserBreakdown as $name => $val) {
            $browserBreakdownData[] = ['name' => $name, 'value' => $val];
        }
        usort($browserBreakdownData, fn($a, $b) => $b['value'] <=> $a['value']);
        if (count($browserBreakdownData) > 5) {
            $topBrowsers = array_slice($browserBreakdownData, 0, 4);
            $otherVal = array_sum(array_column(array_slice($browserBreakdownData, 4), 'value'));
            $topBrowsers[] = ['name' => 'Other', 'value' => $otherVal];
            $browserBreakdownData = $topBrowsers;
        }

        // Time Spent Distribution (opened_at to clicked_at delta)
        $timeSpentBrackets = [
            'Immediate (< 10s)' => 0,
            'Quick scan (10s-1m)' => 0,
            'Engaged (1m-5m)' => 0,
            'Deep dive (5m-30m)' => 0,
            'Delayed (30m+)' => 0,
        ];

        $engagedLogs = (clone $sendLogs)
            ->whereNotNull('opened_at')
            ->whereNotNull('clicked_at')
            ->get(['opened_at', 'clicked_at']);

        foreach ($engagedLogs as $log) {
            $open = \Carbon\Carbon::parse($log->opened_at);
            $click = \Carbon\Carbon::parse($log->clicked_at);
            $diff = $click->diffInSeconds($open);

            if ($diff < 0) {
                $timeSpentBrackets['Immediate (< 10s)']++;
            } elseif ($diff < 10) {
                $timeSpentBrackets['Immediate (< 10s)']++;
            } elseif ($diff < 60) {
                $timeSpentBrackets['Quick scan (10s-1m)']++;
            } elseif ($diff < 300) {
                $timeSpentBrackets['Engaged (1m-5m)']++;
            } elseif ($diff < 1800) {
                $timeSpentBrackets['Deep dive (5m-30m)']++;
            } else {
                $timeSpentBrackets['Delayed (30m+)']++;
            }
        }

        $timeSpentDistribution = [];
        foreach ($timeSpentBrackets as $bracketName => $count) {
            $timeSpentDistribution[] = ['name' => $bracketName, 'value' => $count];
        }

        // Dynamic chronological opens & clicks timeline (no future entries)
        $startTime = $campaign->created_at;
        $now = now();
        $hoursSinceStart = $startTime->diffInHours($now);

        $hourlyOpens = [];
        if ($hoursSinceStart < 24) {
            $totalHoursToShow = max(1, min(24, intval($hoursSinceStart) + 1));
            
            $openedAtList = (clone $sendLogs)
                ->whereBetween('opened_at', [$startTime, $now])
                ->pluck('opened_at')
                ->map(fn($date) => \Carbon\Carbon::parse($date));

            $clickedAtList = (clone $sendLogs)
                ->whereBetween('clicked_at', [$startTime, $now])
                ->pluck('clicked_at')
                ->map(fn($date) => \Carbon\Carbon::parse($date));

            for ($i = 0; $i < $totalHoursToShow; $i++) {
                $time = $startTime->copy()->addHours($i);
                $nextTime = $time->copy()->addHour();
                
                $openCount = $openedAtList->filter(function($openedAt) use ($time, $nextTime) {
                    return $openedAt->between($time, $nextTime);
                })->count();

                $clickCount = $clickedAtList->filter(function($clickedAt) use ($time, $nextTime) {
                    return $clickedAt->between($time, $nextTime);
                })->count();
                
                $hourlyOpens[] = [
                    'time' => $time->format('H:i'), 
                    'opens' => $openCount,
                    'clicks' => $clickCount
                ];
            }
        } else {
            $daysSinceStart = $startTime->diffInDays($now);
            $totalDaysToShow = max(1, min(7, intval($daysSinceStart) + 1));
            
            $openedAtList = (clone $sendLogs)
                ->whereBetween('opened_at', [$startTime, $now])
                ->pluck('opened_at')
                ->map(fn($date) => \Carbon\Carbon::parse($date));

            $clickedAtList = (clone $sendLogs)
                ->whereBetween('clicked_at', [$startTime, $now])
                ->pluck('clicked_at')
                ->map(fn($date) => \Carbon\Carbon::parse($date));

            for ($i = 0; $i < $totalDaysToShow; $i++) {
                $date = $startTime->copy()->addDays($i);
                $startOfDay = $date->copy()->startOfDay();
                $endOfDay = $date->copy()->endOfDay();
                
                $openCount = $openedAtList->filter(function($openedAt) use ($startOfDay, $endOfDay) {
                    return $openedAt->between($startOfDay, $endOfDay);
                })->count();

                $clickCount = $clickedAtList->filter(function($clickedAt) use ($startOfDay, $endOfDay) {
                    return $clickedAt->between($startOfDay, $endOfDay);
                })->count();
                
                $hourlyOpens[] = [
                    'time' => $date->format('M d'), 
                    'opens' => $openCount,
                    'clicks' => $clickCount
                ];
            }
        }

        // Dynamic link clicks performance from tracking_data
        $linkClicks = [];
        if ($campaign->cta_url) {
            $linkClicks[$campaign->cta_url] = 0;
        }

        $campaign->variants()->get()->each(function($v) use (&$linkClicks) {
            if ($v->cta_url) {
                $linkClicks[$v->cta_url] = 0;
            }
        });

        foreach ($logsWithTracking as $log) {
            $data = $log->tracking_data;
            if (is_array($data) && isset($data['clicked_urls'])) {
                foreach ($data['clicked_urls'] as $clickInfo) {
                    $url = $clickInfo['url'] ?? null;
                    if ($url) {
                        $linkClicks[$url] = ($linkClicks[$url] ?? 0) + 1;
                    }
                }
            }
        }

        // Reconcile legacy clicks with the link breakdown
        $sumOfParsedClicks = array_sum($linkClicks);
        if ($totalClicks > $sumOfParsedClicks) {
            $mainUrl = $campaign->cta_url ?: 'https://example.com/main';
            $linkClicks[$mainUrl] = ($linkClicks[$mainUrl] ?? 0) + ($totalClicks - $sumOfParsedClicks);
        }

        $linkPerformance = [];
        foreach ($linkClicks as $url => $clicks) {
            $linkPerformance[] = ['url' => $url, 'clicks' => $clicks];
        }

        if (empty($linkPerformance)) {
            $linkPerformance[] = ['url' => $campaign->cta_url ?? 'https://example.com/main', 'clicks' => 0];
        }

        // Recipients details
        $recipientList = (clone $sendLogs)
            ->with('recipient')
            ->latest()
            ->get()
            ->map(fn($log) => [
                'id' => $log->id,
                'email' => $log->email,
                'status' => ucfirst($log->status),
                'openCount' => (int)$log->opens_count,
                'clickCount' => (int)$log->clicks_count,
                'location' => $log->region ?? 'Unknown',
                'device' => is_array($log->tracking_data) ? ($log->tracking_data['device_type'] ?? 'Unknown') : 'Unknown',
                'browser' => is_array($log->tracking_data) ? ($log->tracking_data['browser'] ?? 'Unknown') : 'Unknown',
                'unsubscribed' => $log->status === 'unsubscribed',
                'lastActivity' => $log->last_activity_at ? $log->last_activity_at->diffForHumans() : 'No activity'
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
                'opened' => $uniqueOpens,
                'opened_total' => $totalOpens,
                'clicked' => $uniqueClicks,
                'clicked_total' => $totalClicks,
                'bounced' => $bounceCount,
                'unsubscribed' => $unsubscribedCount,
            ],
            'rates' => [
                'delivery' => $deliveryRate,
                'open' => $openRate,
                'click' => $clickRate,
                'bounce' => $bounceRate,
                'unsubscribe' => $unsubscribeRate,
                'ctor' => $ctorRate,
                'inbox_placement' => $inboxPlacementRate,
            ],
            'hourlyOpens' => $hourlyOpens,
            'regionBreakdown' => $regionBreakdown,
            'deviceBreakdown' => $deviceBreakdownData,
            'browserBreakdown' => $browserBreakdownData,
            'timeSpentDistribution' => $timeSpentDistribution,
            'recipients' => $recipientList,
            'linkPerformance' => $linkPerformance
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

