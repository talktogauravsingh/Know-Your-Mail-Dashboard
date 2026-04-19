<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

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
    Route::get('/', [\App\Http\Controllers\Api\RoleController::class, 'index']);
    Route::get('/{role}', [\App\Http\Controllers\Api\RoleController::class, 'show']);
    Route::post('/', [\App\Http\Controllers\Api\RoleController::class, 'store'])->middleware('permissions:manage_roles');
    Route::put('/{role}', [\App\Http\Controllers\Api\RoleController::class, 'update'])->middleware('permissions:manage_roles');
    Route::delete('/{role}', [\App\Http\Controllers\Api\RoleController::class, 'destroy'])->middleware('permissions:manage_roles');
});

Route::middleware(['auth:sanctum', 'permissions:view_permissions'])->prefix('permissions')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\PermissionController::class, 'index']);
    Route::get('/{permission}', [\App\Http\Controllers\Api\PermissionController::class, 'show']);
    Route::post('/', [\App\Http\Controllers\Api\PermissionController::class, 'store'])->middleware('permissions:manage_permissions');
    Route::put('/{permission}', [\App\Http\Controllers\Api\PermissionController::class, 'update'])->middleware('permissions:manage_permissions');
    Route::delete('/{permission}', [\App\Http\Controllers\Api\PermissionController::class, 'destroy'])->middleware('permissions:manage_permissions');
});

Route::middleware(['auth:sanctum', 'permissions:manage_roles'])->prefix('roles/{role}/permissions')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\RolePermissionController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\RolePermissionController::class, 'store']);
    Route::delete('/', [\App\Http\Controllers\Api\RolePermissionController::class, 'destroy']);
});

Route::prefix('recipients')->group(function () {
    Route::post('bulk-upload', [\App\Http\Controllers\Api\BulkRecipientController::class, 'bulkUpload']);
});

Route::get('/o/{requestUserId}', [\App\Http\Controllers\Tracking\TrackingController::class, 'OpenMailTrack']);
