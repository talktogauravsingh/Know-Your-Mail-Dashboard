<?php

namespace App\Http\Middleware;

use Closure;
use App\Services\FeatureGateService;
use Illuminate\Http\Request;

class EnforceFeatureGate
{
    public function __construct(
        private readonly FeatureGateService $gate
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $featureKey)
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'User is not attached to an organization.'], 401);
        }

        if (!$this->gate->hasAccess($featureKey, (int) $user->organization_id)) {
            return response()->json([
                'error' => 'feature_locked',
                'feature_key' => $featureKey,
                'message' => 'This feature is locked under your current plan. Please upgrade.',
                'upgrade_url' => '/billing',
            ], 403);
        }

        return $next($request);
    }
}
