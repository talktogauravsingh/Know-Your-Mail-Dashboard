<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\PermissionRepository;
use App\Repositories\RoleRepository;
use App\Repositories\AuthRepository;
use App\Services\BulkImportService;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

