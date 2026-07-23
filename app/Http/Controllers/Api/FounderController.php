<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\PaymentTransaction;
use App\Models\Recipient;
use App\Models\SendLog;
use App\Models\User;
use App\Models\SenderDomain;
use App\Models\SystemConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

class FounderController extends Controller
{
    /**
     * Get platform-wide metrics for the founder.
     */
    public function metrics()
    {
        try {
            // 1. Platform Growth Metrics
            $orgsCount = Organization::count();
            $usersCount = User::count();
            $campaignsCount = Campaign::count();
            $recipientsCount = Recipient::count();
            $sendersCount = SenderDomain::count();

            // 2. Global Campaign Performance Metrics
            $sentCount = SendLog::count();
            $deliveredCount = SendLog::whereNotNull('delivered_at')->count();
            $openedCount = SendLog::whereNotNull('opened_at')->count();
            $clickedCount = SendLog::where('clicks_count', '>', 0)->count();
            $bouncedCount = SendLog::where('bounce_type', '!=', 'none')->count();

            $deliveryRate = $sentCount > 0 ? round(($deliveredCount / $sentCount) * 100, 2) : 0;
            $openRate = $sentCount > 0 ? round(($openedCount / $sentCount) * 100, 2) : 0;
            $clickRate = $sentCount > 0 ? round(($clickedCount / $sentCount) * 100, 2) : 0;
            $bounceRate = $sentCount > 0 ? round(($bouncedCount / $sentCount) * 100, 2) : 0;

            // 3. Financial/Billing Metrics
            $totalRevenue = PaymentTransaction::where('status', PaymentTransaction::STATUS_PAID)->sum('amount_minor') / 100;
            $paymentsCount = PaymentTransaction::where('status', PaymentTransaction::STATUS_PAID)->count();

            // Calculate MRR estimate from active subscriptions
            $activeSubscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_ACTIVE)->get();
            $mrr = 0;
            foreach ($activeSubscriptions as $sub) {
                $amount = ($sub->amount_minor ?? 0) / 100;
                if ($sub->billing_interval === 'month') {
                    $mrr += $amount;
                } elseif ($sub->billing_interval === 'year') {
                    $mrr += $amount / 12;
                } elseif ($sub->billing_interval === 'week') {
                    $mrr += $amount * 4.33;
                } else {
                    $mrr += $amount;
                }
            }

            // 4. Queue / Jobs status
            $queueSize = 0;
            try {
                $queueSize = Queue::size();
            } catch (\Exception $qe) {
                Log::warning('Failed to fetch queue size: ' . $qe->getMessage());
            }
            $failedJobsCount = DB::table('failed_jobs')->count();

            // 5. Campaign states breakdown
            $campaignStatusBreakdown = Campaign::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status')
                ->toArray();

            // 6. Recent Activity
            // Recent Organizations
            $recentOrgs = Organization::with('subscription')
                ->latest()
                ->take(5)
                ->get()
                ->map(function ($org) {
                    return [
                        'id' => $org->id,
                        'name' => $org->name,
                        'created_at' => $org->created_at ? $org->created_at->toIso8601String() : null,
                        'plan' => $org->subscription ? $org->subscription->plan_key : 'Free',
                        'status' => $org->subscription ? OrganizationSubscription::labelForStatus($org->subscription->status) : 'inactive',
                    ];
                });

            // Recent Payments
            $recentPayments = PaymentTransaction::with(['organization', 'user'])
                ->where('status', PaymentTransaction::STATUS_PAID)
                ->latest()
                ->take(5)
                ->get()
                ->map(function ($tx) {
                    return [
                        'id' => $tx->id,
                        'org_name' => $tx->organization->name ?? 'N/A',
                        'user_name' => $tx->user->name ?? 'N/A',
                        'user_email' => $tx->user->email ?? 'N/A',
                        'amount' => $tx->amount_minor / 100,
                        'currency' => $tx->currency,
                        'provider' => $tx->provider,
                        'paid_at' => $tx->updated_at ? $tx->updated_at->toIso8601String() : null,
                    ];
                });

            // Recent Campaigns
            $recentCampaigns = Campaign::latest()
                ->take(5)
                ->get()
                ->map(function ($campaign) {
                    return [
                        'id' => $campaign->id,
                        'name' => $campaign->name,
                        'status' => $campaign->status,
                        'sent_count' => $campaign->sendLogs()->count(),
                        'created_at' => $campaign->created_at ? $campaign->created_at->toIso8601String() : null,
                    ];
                });

            // Failed Jobs List
            $failedJobsList = DB::table('failed_jobs')
                ->orderBy('failed_at', 'desc')
                ->take(5)
                ->get()
                ->map(function ($job) {
                    $jobName = 'Unknown Job';
                    $payload = json_decode($job->payload, true);
                    if (is_array($payload) && isset($payload['displayName'])) {
                        $jobName = $payload['displayName'];
                    } elseif (is_array($payload) && isset($payload['job'])) {
                        $jobName = $payload['job'];
                    }
                    return [
                        'id' => $job->id,
                        'connection' => $job->connection,
                        'queue' => $job->queue,
                        'name' => $jobName,
                        'failed_at' => $job->failed_at,
                        'exception' => substr($job->exception, 0, 200) . (strlen($job->exception) > 200 ? '...' : ''),
                    ];
                });

            return response()->json([
                'success' => true,
                'metrics' => [
                    'platform' => [
                        'organizations' => $orgsCount,
                        'users' => $usersCount,
                        'campaigns' => $campaignsCount,
                        'recipients' => $recipientsCount,
                        'senders' => $sendersCount,
                    ],
                    'campaigns' => [
                        'sent' => $sentCount,
                        'delivered' => $deliveredCount,
                        'opened' => $openedCount,
                        'clicked' => $clickedCount,
                        'bounced' => $bouncedCount,
                        'delivery_rate' => $deliveryRate,
                        'open_rate' => $openRate,
                        'click_rate' => $clickRate,
                        'bounce_rate' => $bounceRate,
                        'statuses' => $campaignStatusBreakdown,
                    ],
                    'billing' => [
                        'total_revenue' => $totalRevenue,
                        'payments_count' => $paymentsCount,
                        'mrr' => round($mrr, 2),
                    ],
                    'queue' => [
                        'size' => $queueSize,
                        'failed' => $failedJobsCount,
                    ]
                ],
                'recent' => [
                    'organizations' => $recentOrgs,
                    'payments' => $recentPayments,
                    'campaigns' => $recentCampaigns,
                    'failed_jobs' => $failedJobsList,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve founder metrics: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving metrics: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run allowed console command.
     */
    public function runCommand(Request $request)
    {
        $request->validate([
            'command' => 'required|string',
            'arguments' => 'nullable|array',
        ]);

        $command = $request->input('command');
        $inputArgs = $request->input('arguments', []);

        // Strict hardcoded allow-list of commands to run
        $allowedCommands = [
            'campaigns:dispatch' => [],
            'queue:work' => ['--stop-when-empty' => true],
            'billing:process-renewals' => [],
            'billing:sync-plans' => [],
        ];

        if (!array_key_exists($command, $allowedCommands)) {
            return response()->json([
                'success' => false,
                'message' => 'Command not allowed.',
            ], 403);
        }

        try {
            $params = $allowedCommands[$command];

            if ($command === 'campaigns:dispatch' && !empty($inputArgs['campaignId'])) {
                $params['campaignId'] = (int)$inputArgs['campaignId'];
            }
            
            // Call artisan command
            Artisan::call($command, $params);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => "Command '{$command}' executed successfully.",
                'output' => $output ?: 'Command executed, but returned no console output.',
            ]);
        } catch (\Exception $e) {
            Log::error('Founder Console command execution failed', [
                'command' => $command,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Execution Error: ' . $e->getMessage(),
                'output' => $e->getMessage() . "\n" . $e->getTraceAsString(),
            ], 500);
        }
    }

    /**
     * Retry a failed job.
     */
    public function retryFailedJob(Request $request)
    {
        $request->validate([
            'id' => 'required|string', // can be 'all' or specific numeric ID
        ]);

        $id = $request->input('id');

        try {
            // Using Artisan queue:retry
            Artisan::call('queue:retry', ['id' => [$id]]);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'output' => $output ?: "Failed job ID {$id} retried.",
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retry job ' . $id . ': ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrying job: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a failed job.
     */
    public function deleteFailedJob(Request $request)
    {
        $request->validate([
            'id' => 'required|string', // can be 'all' or numeric ID
        ]);

        $id = $request->input('id');

        try {
            if ($id === 'all') {
                DB::table('failed_jobs')->delete();
                $output = "All failed jobs deleted from database.";
            } else {
                Artisan::call('queue:forget', ['id' => $id]);
                $output = Artisan::output() ?: "Failed job ID {$id} deleted.";
            }

            return response()->json([
                'success' => true,
                'output' => $output,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete job ' . $id . ': ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting job: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear all pending queue jobs.
     */
    public function flushQueue()
    {
        try {
            $driver = config('queue.default');
            $output = '';

            if ($driver === 'database') {
                DB::table('jobs')->delete();
                $output = "Database 'jobs' table truncated.";
            } elseif ($driver === 'redis') {
                $redis = \Illuminate\Support\Facades\Redis::connection();
                $redis->del('queues:default');
                $redis->del('queues:default:delayed');
                $redis->del('queues:default:reserved');
                $output = "Redis keys 'queues:default*', 'queues:default:delayed*', 'queues:default:reserved*' deleted.";
            } else {
                $output = "Queue driver '{$driver}' doesn't support dashboard flushing. Please flush manually.";
            }

            return response()->json([
                'success' => true,
                'output' => $output,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to flush queue: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error flushing queue: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retrieve all founder configurations from database.
     */
    public function getConfigs()
    {
        try {
            $configs = SystemConfig::all();
            
            $formattedConfigs = [];
            foreach ($configs as $config) {
                $formattedConfigs[] = [
                    'key' => $config->key,
                    'value' => $config->value ?? '',
                    'description' => $config->description ?? '',
                    'updated_at' => $config->updated_at ? $config->updated_at->toIso8601String() : null,
                ];
            }
            
            return response()->json([
                'success' => true,
                'configs' => $formattedConfigs,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve founder configurations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving configurations: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add or update a configuration key-value pair in system_configs database table.
     */
    public function saveConfig(Request $request)
    {
        $request->validate([
            'key' => 'required|string|max:100',
            'value' => 'required|string',
            'description' => 'nullable|string|max:255',
        ]);

        $key = strtoupper(preg_replace('/[^A-Za-z0-9_]/', '', $request->input('key')));
        $value = $request->input('value');
        $description = $request->input('description', null);

        try {
            SystemConfig::set($key, $value, $description);

            return response()->json([
                'success' => true,
                'message' => "Configuration '{$key}' saved successfully to database.",
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to save configuration {$key}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error saving configuration: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a configuration from database.
     */
    public function deleteConfig($key)
    {
        $key = strtoupper($key);
        try {
            $config = SystemConfig::find($key);
            
            if (!$config) {
                return response()->json([
                    'success' => false,
                    'message' => "Configuration '{$key}' not found.",
                ], 404);
            }

            $config->delete();
            SystemConfig::clearCache();

            return response()->json([
                'success' => true,
                'message' => "Configuration '{$key}' deleted successfully.",
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to delete configuration {$key}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting configuration: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear cached system configuration.
     */
    public function clearConfigCache()
    {
        try {
            SystemConfig::clearCache();
            return response()->json([
                'success' => true,
                'message' => 'System configuration cache cleared successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to clear system config cache: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error clearing config cache: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Public static helper to refer to a configuration key.
     */
    public static function getSetting($key, $default = null)
    {
        try {
            return SystemConfig::get($key, $default);
        } catch (\Exception $e) {
            Log::error("Failed to retrieve setting {$key}: " . $e->getMessage());
        }
        return $default;
    }

    /**
     * Get the current Redis connection details and check status.
     */
    public function getRedisConnection()
    {
        $filePath = storage_path('app/redis_connection.json');
        $configData = [
            'host' => config('database.redis.default.host'),
            'port' => config('database.redis.default.port'),
            'password' => config('database.redis.default.password') ? '********' : '',
            'configured' => false,
        ];

        if (file_exists($filePath)) {
            $data = json_decode(file_get_contents($filePath), true);
            if (is_array($data)) {
                $configData['host'] = $data['host'] ?? '';
                $configData['port'] = $data['port'] ?? '6379';
                $configData['password'] = !empty($data['password']) ? '********' : '';
                $configData['configured'] = true;
            }
        }

        // Test active connection status
        $status = 'disconnected';
        $error = null;
        try {
            // Attempt to ping Redis connection
            \Illuminate\Support\Facades\Redis::connection()->ping();
            $status = 'connected';
        } catch (\Exception $e) {
            $error = $e->getMessage();
        }

        return response()->json([
            'success' => true,
            'connection' => $configData,
            'status' => $status,
            'error' => $error,
        ]);
    }

    /**
     * Test and save dynamic Redis connection details.
     */
    public function saveRedisConnection(Request $request)
    {
        $request->validate([
            'host' => 'required|string',
            'port' => 'required|integer|min:1|max:65535',
            'password' => 'nullable|string',
        ]);

        $host = $request->input('host');
        $port = (int)$request->input('port');
        $password = $request->input('password');

        // If password is sent as mask (********) and config file exists, keep original password
        if ($password === '********') {
            $filePath = storage_path('app/redis_connection.json');
            if (file_exists($filePath)) {
                $existing = json_decode(file_get_contents($filePath), true);
                $password = $existing['password'] ?? null;
            } else {
                $password = config('database.redis.default.password');
            }
        }

        // Test connection using Predis
        try {
            $client = new \Predis\Client([
                'scheme' => 'tcp',
                'host'   => $host,
                'port'   => $port,
                'password' => $password,
                'timeout' => 2.0,
            ]);
            $client->ping();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Redis connection failed: ' . $e->getMessage(),
            ], 422);
        }

        // Save to file
        try {
            $filePath = storage_path('app/redis_connection.json');
            $dir = dirname($filePath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            
            file_put_contents($filePath, json_encode([
                'host' => $host,
                'port' => $port,
                'password' => $password,
                'updated_at' => now()->toIso8601String(),
            ], JSON_PRETTY_PRINT));

            // Dynamically update config for current request so subsequent queries use it immediately
            config([
                'database.redis.default.host' => $host,
                'database.redis.default.port' => $port,
                'database.redis.default.password' => $password,
                'database.redis.cache.host' => $host,
                'database.redis.cache.port' => $port,
                'database.redis.cache.password' => $password,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Redis connection saved and established successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save Redis configuration: ' . $e->getMessage(),
            ], 500);
        }
    }
}
