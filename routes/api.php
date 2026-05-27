<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\BulkRecipientController;
use App\Http\Controllers\Api\AnalysisController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Tracking\TrackingController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/insights/org', [\App\Http\Controllers\Api\SegmentationController::class, 'getOrgInsights'])->middleware('auth:sanctum');

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->prefix('managers')->group(function () {
    Route::post('/', [AuthController::class, 'createManager'])->middleware('permissions:create_manager');
});

Route::middleware(['auth:sanctum', 'permissions:view_roles'])->prefix('roles')->group(function () {
    Route::get('/', [RoleController::class, 'index']);
    Route::get('/{role}', [RoleController::class, 'show']);
    Route::post('/', [RoleController::class, 'store'])->middleware('permissions:manage_roles');
    Route::put('/{role}', [RoleController::class, 'update'])->middleware('permissions:manage_roles');
    Route::delete('/{role}', [RoleController::class, 'destroy'])->middleware('permissions:manage_roles');
});

Route::middleware(['auth:sanctum', 'permissions:view_permissions'])->prefix('permissions')->group(function () {
    Route::get('/', [PermissionController::class, 'index']);
    Route::get('/{permission}', [PermissionController::class, 'show']);
    Route::post('/', [PermissionController::class, 'store'])->middleware('permissions:manage_permissions');
    Route::put('/{permission}', [PermissionController::class, 'update'])->middleware('permissions:manage_permissions');
    Route::delete('/{permission}', [PermissionController::class, 'destroy'])->middleware('permissions:manage_permissions');
});

Route::middleware(['auth:sanctum', 'permissions:manage_roles'])->prefix('roles/{role}/permissions')->group(function () {
    Route::get('/', [RolePermissionController::class, 'index']);
    Route::post('/', [RolePermissionController::class, 'store']);
    Route::delete('/', [RolePermissionController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->prefix('recipients')->group(function () {
    Route::post('bulk-upload', [\App\Http\Controllers\Api\BulkRecipientController::class, 'bulkUpload']);
});

// Analysis APIs
Route::middleware(['auth:sanctum'])->prefix('analysis')->group(function () {
    Route::get('dashboard', [AnalysisController::class, 'dashboard']);
    Route::get('hierarchical', [AnalysisController::class, 'hierarchical']);
    Route::get('campaign/{id}', [AnalysisController::class, 'campaignAnalysis']);
    Route::get('template/{id}', [AnalysisController::class, 'templateAnalysis']);

    Route::middleware('permissions:track_conversions')->group(function () {
        Route::post('conversion', [AnalysisController::class, 'recordConversion']);
    });
});

// Campaigns API
Route::middleware('auth:sanctum')->prefix('campaigns')->group(function () {
    Route::get('/', [CampaignController::class, 'index']);
    Route::post('/', [CampaignController::class, 'store']);
    Route::get('/{campaign}', [CampaignController::class, 'show']);
    Route::patch('/{campaign}', [CampaignController::class, 'update']);
    Route::get('/{campaign}/insights', [\App\Http\Controllers\Api\SegmentationController::class, 'getInsights']);
    Route::post('/segments/validate-count/{campaign?}', [\App\Http\Controllers\Api\SegmentationController::class, 'validateCount']);
});

Route::get('/track/open/{sendLog}', [TrackingController::class, 'OpenMailTrack']);
Route::get('/track/click/{sendLog}', [TrackingController::class, 'ClickMailTrack']);
Route::get('/o/{sendLog}', [TrackingController::class, 'OpenMailTrack']);
Route::get('/c/{sendLog}', [TrackingController::class, 'ClickMailTrack']);
Route::middleware('auth:sanctum')->prefix('email-templates')->group(function () {
    Route::get('/', [\App\Http\Controllers\EmailTemplateController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\EmailTemplateController::class, 'store']);
    Route::get('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'show']);
    Route::patch('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'update']);
    Route::delete('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'destroy']);
    Route::post('/{template}/duplicate', [\App\Http\Controllers\EmailTemplateController::class, 'duplicate']);
    Route::post('/{template}/render', [\App\Http\Controllers\EmailTemplateController::class, 'render']);
    Route::post('/{template}/test-send', [\App\Http\Controllers\EmailTemplateController::class, 'testSend']);
});

Route::get('/o/{requestUserId}', [TrackingController::class, 'OpenMailTrack']);
Route::get('/c/{requestUserId}', [TrackingController::class, 'ClickMailTrack']);
Route::prefix('v1')->group(function () {
    Route::post('spam/check', [\App\Http\Controllers\Api\EmailAIController::class, 'spamCheck']);
    Route::post('email/generate', [\App\Http\Controllers\Api\EmailAIController::class, 'generate']);
    Route::post('email/rewrite', [\App\Http\Controllers\Api\EmailAIController::class, 'rewrite']);
    Route::post('email/score', [\App\Http\Controllers\Api\EmailAIController::class, 'score']);
    Route::get('health', [\App\Http\Controllers\Api\EmailAIController::class, 'health']);
});

Route::post('/payments/webhooks/razorpay', [PaymentController::class, 'razorpayWebhook']);

Route::middleware('auth:sanctum')->prefix('payments')->group(function () {
    Route::post('/orders', [PaymentController::class, 'createOrder']);
    Route::post('/verify', [PaymentController::class, 'verify']);
    Route::get('/{transaction}/status', [PaymentController::class, 'status']);
});

Route::middleware('auth:sanctum')->prefix('billing')->group(function () {
    Route::get('/summary', [BillingController::class, 'summary']);
    Route::get('/plans', [BillingController::class, 'plans']);
    Route::get('/history', [BillingController::class, 'history']);
});

Route::middleware('auth:sanctum')->prefix('smtp-configurations')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'store']);
    Route::put('/{smtpConfiguration}', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'update']);
    Route::delete('/{smtpConfiguration}', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'destroy']);
    Route::post('/{smtpConfiguration}/activate', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'activate']);
});
