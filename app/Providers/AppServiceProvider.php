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

class AppServiceProvider extends ServiceProvider
{
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
        //
    }
}
