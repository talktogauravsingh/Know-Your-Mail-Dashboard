<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
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

Route::prefix('recipients')->group(function () {
    Route::post('bulk-upload', [\App\Http\Controllers\Api\BulkRecipientController::class, 'bulkUpload']);
});

// Analysis APIs
Route::middleware(['auth:sanctum'])->prefix('analysis')->group(function () {
    Route::middleware('permissions:view_campaign_analysis')->group(function () {
        Route::get('dashboard', [AnalysisController::class, 'dashboard']);
        Route::get('hierarchical', [AnalysisController::class, 'hierarchical']);
        Route::get('campaign/{id}', [AnalysisController::class, 'campaignAnalysis']);
        Route::get('template/{id}', [AnalysisController::class, 'templateAnalysis']);
    });

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
    Route::post('/{campaign}/segments/validate-count', [\App\Http\Controllers\Api\SegmentationController::class, 'validateCount']);
});

Route::get('/o/{requestUserId}', [TrackingController::class, 'OpenMailTrack']);
Route::get('/c/{requestUserId}', [TrackingController::class, 'ClickMailTrack']);
Route::post('ai/email/generate', [\App\Http\Controllers\Api\EmailAIController::class, 'generate']);
