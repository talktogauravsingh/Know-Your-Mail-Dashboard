<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\PermissionRepository;
use App\Repositories\RoleRepository;
use App\Repositories\AuthRepository;
use App\Services\BulkImportService;
use App\Services\Payments\Contracts\PaymentProviderInterface;
use App\Services\Payments\Providers\Razorpay\RazorpayProvider;
use App\Services\Payments\Providers\Razorpay\RazorpayWebhookVerificationStrategy;
use App\Services\RecipientValidationService;
use App\Models\EmailTemplate;
use App\Policies\EmailTemplatePolicy;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    protected $policies = [
        EmailTemplate::class => EmailTemplatePolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PermissionRepository::class);
        $this->app->singleton(RoleRepository::class);
        $this->app->singleton(AuthRepository::class);
        $this->app->singleton(BulkImportService::class);
        $this->app->singleton(RecipientValidationService::class);
        $this->app->singleton(RazorpayWebhookVerificationStrategy::class, function () {
            return new RazorpayWebhookVerificationStrategy((string) config('services.razorpay.webhook_secret'));
        });
        $this->app->singleton(PaymentProviderInterface::class, function ($app) {
            return new RazorpayProvider(
                apiKey: (string) config('services.razorpay.key'),
                apiSecret: (string) config('services.razorpay.secret'),
                webhookVerification: $app->make(RazorpayWebhookVerificationStrategy::class),
                baseUrl: (string) config('services.razorpay.base_url'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Dynamically override Redis host/port if a custom connection has been saved by QA
        $connectionFile = storage_path('app/redis_connection.json');
        if (file_exists($connectionFile)) {
            try {
                $connectionData = json_decode(file_get_contents($connectionFile), true);
                if (is_array($connectionData) && !empty($connectionData['host'])) {
                    $host = $connectionData['host'];
                    $port = $connectionData['port'] ?? '6379';
                    $password = $connectionData['password'] ?? null;

                    config([
                        'database.redis.default.host' => $host,
                        'database.redis.default.port' => $port,
                        'database.redis.default.password' => $password,
                        'database.redis.cache.host' => $host,
                        'database.redis.cache.port' => $port,
                        'database.redis.cache.password' => $password,
                    ]);
                }
            } catch (\Exception $e) {
                // Gracefully log instead of crashing application boot if configuration is corrupt
                \Illuminate\Support\Facades\Log::error('Failed to bootstrap dynamic Redis connection: ' . $e->getMessage());
            }
        }

        // Dynamically override runtime configs from DB system_configs if available
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('system_configs')) {
                $appUrl = \App\Models\SystemConfig::get('APP_URL');
                if ($appUrl) {
                    config(['app.url' => $appUrl]);
                }
                $trackingUrl = \App\Models\SystemConfig::get('TRACKING_BASE_URL');
                if ($trackingUrl) {
                    config(['mail.tracking_base_url' => $trackingUrl]);
                }
                $geminiKey = \App\Models\SystemConfig::get('GEMINI_API_KEY');
                if ($geminiKey) {
                    config(['ai.providers.gemini.key' => $geminiKey]);
                }
            }
        } catch (\Throwable $e) {
            // Ignore during early migrations or when database connection isn't initialized
        }
    }

    protected function registerPolicies(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}
