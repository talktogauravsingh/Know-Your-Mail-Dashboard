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

        if (!$user->hasPermission('view_hierarchical_analysis')) {
            abort(403, 'Insufficient permissions');
        }

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

        if (!$user->hasPermission('view_campaign_analysis')) {
            abort(403, 'Insufficient permissions');
        }

        $recipients = Recipient::where('campaign_id', $id)->forUserHierarchy($user);
        $sendLogs = SendLog::where('campaign_id', $id)->forUserHierarchy($user);

        $sentCount = $sendLogs->count();
        $openedCount = $sendLogs->whereNotNull('opened_at')->count();
        $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 2) : 0;

$deliveredCount = $sendLogs->whereNotNull('delivered_at')->count();
        $clicksTotal = $sendLogs->sum('clicks_count');
        $bounceCount = $sendLogs->where('bounce_type', '!=', 'none')->sum('bounce_count');
        $bounceRate = $sentCount > 0 ? round(($bounceCount / $sentCount) * 100, 2) : 0;
        $deliveryRate = $sentCount > 0 ? round(($deliveredCount / $sentCount) * 100, 2) : 0;
        $clickRate = $sentCount > 0 ? round(($clicksTotal / $sentCount) * 100, 2) : 0;

        $statusBreakdown = $sendLogs->groupBy('status')->map->count();
        $regionBreakdown = $sendLogs->whereNotNull('region')->groupBy('region')->map->count();

        $conversions = Conversion::where('campaign_id', $id)->forUserHierarchy($user);
        $conversionCount = $conversions->count();
        $conversionValue = $conversions->sum('value');

        return response()->json([
            'campaign' => $campaign->only(['id', 'name', 'subject', 'status']),
            'recipients_count' => $recipients->count(),
            'sent_count' => $sentCount,
            'delivered_count' => $deliveredCount,
            'delivered_rate' => $deliveryRate,
            'opened_count' => $openedCount,
            'open_rate' => $openRate,
            'clicks_total' => $clicksTotal,
            'click_rate' => $clickRate,
            'bounce_count' => $bounceCount,
            'bounce_rate' => $bounceRate,
            'status_breakdown' => $statusBreakdown,
            'region_breakdown' => $regionBreakdown,
            'conversion_count' => $conversionCount,
            'conversion_value' => $conversionValue,
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
}

