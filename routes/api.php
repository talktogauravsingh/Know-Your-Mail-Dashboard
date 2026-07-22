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
use App\Http\Controllers\Api\AuthPermissionController;

Route::get('/user', function (Request $request) {
    return $request->user()->load('role.permissions')->append('auth_permissions');
})->middleware('auth:sanctum');

Route::get('/insights/org', [\App\Http\Controllers\Api\SegmentationController::class, 'getOrgInsights'])->middleware('auth:sanctum');

Route::prefix('auth')->group(function () {
    Route::post('send-otp', [AuthController::class, 'sendOtp'])->middleware('throttle:5,1');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::post('reset-temporary-password', [AuthController::class, 'resetTemporaryPassword'])->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->prefix('managers')->group(function () {
    Route::post('/', [AuthController::class, 'createManager'])->middleware('permissions:create_manager');
});

Route::middleware('auth:sanctum')->prefix('organization/users')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\OrganizationUserController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\OrganizationUserController::class, 'store']);
    Route::delete('/{user}', [\App\Http\Controllers\Api\OrganizationUserController::class, 'destroy']);
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
    Route::post('bulk-upload', [\App\Http\Controllers\Api\BulkRecipientController::class, 'bulkUpload'])->middleware('page_action:Global Import,create');
});

// Analysis APIs
Route::middleware(['auth:sanctum'])->prefix('analysis')->group(function () {
    Route::get('dashboard', [AnalysisController::class, 'dashboard']);
    Route::get('hierarchical', [AnalysisController::class, 'hierarchical'])->middleware('feature:advanced_analytics');
    Route::get('campaign/{id}', [AnalysisController::class, 'campaignAnalysis'])->middleware('feature:advanced_analytics');
    Route::get('template/{id}', [AnalysisController::class, 'templateAnalysis']);

    Route::middleware(['permissions:track_conversions', 'feature:track_conversions'])->group(function () {
        Route::post('conversion', [AnalysisController::class, 'recordConversion']);
    });
});

// Campaigns API
Route::middleware('auth:sanctum')->prefix('campaigns')->group(function () {
    Route::middleware('page_action:Campaigns,view')->group(function () {
        Route::get('/', [CampaignController::class, 'index']);
        Route::get('/org-recipients', [CampaignController::class, 'getOrgRecipients']);
        Route::get('/{campaign}', [CampaignController::class, 'show']);
        Route::get('/{campaign}/insights', [\App\Http\Controllers\Api\SegmentationController::class, 'getInsights']);
    });

    Route::middleware('page_action:Campaigns,create')->group(function () {
        Route::post('/', [CampaignController::class, 'store']);
        Route::post('/preview', [CampaignController::class, 'preview']);
        Route::post('/extract-variables', [CampaignController::class, 'extractVariables']);
        Route::post('/segments/validate-count/{campaign?}', [\App\Http\Controllers\Api\SegmentationController::class, 'validateCount']);
    });

    Route::middleware('page_action:Campaigns,edit')->group(function () {
        Route::patch('/{campaign}', [CampaignController::class, 'update']);
    });
});

Route::get('/track/open/{sendLog}', [TrackingController::class, 'OpenMailTrack'])->whereUuid('sendLog');
Route::get('/track/click/{sendLog}', [TrackingController::class, 'ClickMailTrack'])->whereUuid('sendLog');
Route::get('/o/{sendLog}', [TrackingController::class, 'OpenMailTrack'])->whereUuid('sendLog');
Route::get('/c/{sendLog}', [TrackingController::class, 'ClickMailTrack'])->whereUuid('sendLog');

Route::get('/track/open/{recipientId}', [TrackingController::class, 'OpenRelayTrack'])->whereUuid('recipientId');
Route::get('/track/click/{linkId}/{recipientId}', [TrackingController::class, 'ClickRelayTrack'])->whereUuid('linkId')->whereUuid('recipientId');
Route::post('/internal/relay-event', [TrackingController::class, 'handleRelayEvent']);

Route::middleware('auth:sanctum')->prefix('email-templates')->group(function () {
    Route::middleware('page_action:Templates,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\EmailTemplateController::class, 'index']);
        Route::get('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'show']);
        Route::post('/{template}/render', [\App\Http\Controllers\EmailTemplateController::class, 'render']);
    });

    Route::middleware('page_action:Templates,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\EmailTemplateController::class, 'store']);
        Route::post('/{template}/duplicate', [\App\Http\Controllers\EmailTemplateController::class, 'duplicate']);
        Route::post('/{template}/test-send', [\App\Http\Controllers\EmailTemplateController::class, 'testSend']);
    });

    Route::middleware('page_action:Templates,edit')->group(function () {
        Route::patch('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'update']);
    });

    Route::middleware('page_action:Templates,delete')->group(function () {
        Route::delete('/{template}', [\App\Http\Controllers\EmailTemplateController::class, 'destroy']);
    });
});


Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::post('spam/check', [\App\Http\Controllers\Api\EmailAIController::class, 'spamCheck'])->middleware('feature:ai_generation');
    Route::post('email/generate', [\App\Http\Controllers\Api\EmailAIController::class, 'generate'])->middleware('feature:ai_generation');
    Route::post('email/generate-stream', [\App\Http\Controllers\Api\EmailAIController::class, 'generateStream'])->middleware('feature:ai_generation');
    Route::post('email/rewrite', [\App\Http\Controllers\Api\EmailAIController::class, 'rewrite'])->middleware('feature:ai_generation');
    Route::post('email/score', [\App\Http\Controllers\Api\EmailAIController::class, 'score'])->middleware('feature:ai_generation');
});
Route::get('v1/health', [\App\Http\Controllers\Api\EmailAIController::class, 'health']);

Route::post('/payments/webhooks/razorpay', [PaymentController::class, 'razorpayWebhook']);

Route::middleware(['auth:sanctum', 'throttle:6,1'])->prefix('payments')->group(function () {
    Route::middleware('page_action:Billing & Plan,create')->group(function () {
        Route::post('/orders', [PaymentController::class, 'createOrder']);
        Route::post('/verify', [PaymentController::class, 'verify']);
    });
    Route::middleware('page_action:Billing & Plan,view')->group(function () {
        Route::get('/{transaction}/status', [PaymentController::class, 'status']);
    });
});

Route::middleware(['auth:sanctum', 'page_action:Billing & Plan,view'])->prefix('billing')->group(function () {
    Route::get('/summary', [BillingController::class, 'summary']);
    Route::get('/plans', [BillingController::class, 'plans']);
    Route::get('/history', [BillingController::class, 'history']);
});

Route::middleware('auth:sanctum')->prefix('smtp-configurations')->group(function () {
    Route::middleware('page_action:Settings,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'index']);
    });
    Route::middleware('page_action:Settings,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'store']);
    });
    Route::middleware('page_action:Settings,edit')->group(function () {
        Route::put('/{smtpConfiguration}', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'update']);
        Route::post('/{smtpConfiguration}/activate', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'activate']);
    });
    Route::middleware('page_action:Settings,delete')->group(function () {
        Route::delete('/{smtpConfiguration}', [\App\Http\Controllers\Api\SmtpConfigurationController::class, 'destroy']);
    });
});

Route::middleware('auth:sanctum')->prefix('domains')->group(function () {
    Route::middleware('page_action:Settings,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\SenderDomainController::class, 'index']);
    });
    Route::middleware('page_action:Settings,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\SenderDomainController::class, 'store']);
    });
    Route::middleware('page_action:Settings,edit')->group(function () {
        Route::post('/{id}/verify', [\App\Http\Controllers\Api\SenderDomainController::class, 'verify']);
        Route::post('/{id}/cloudflare', [\App\Http\Controllers\Api\SenderDomainController::class, 'provisionCloudflare']);
    });
    Route::middleware('page_action:Settings,delete')->group(function () {
        Route::delete('/{id}', [\App\Http\Controllers\Api\SenderDomainController::class, 'destroy']);
    });
});

Route::middleware('auth:sanctum')->prefix('smtp-credentials')->group(function () {
    Route::middleware('page_action:Settings,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\SmtpCredentialController::class, 'index']);
    });
    Route::middleware('page_action:Settings,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\SmtpCredentialController::class, 'store']);
        Route::post('/{id}/test-send', [\App\Http\Controllers\Api\SmtpCredentialController::class, 'testSend']);
    });
    Route::middleware('page_action:Settings,edit')->group(function () {
        Route::put('/{id}', [\App\Http\Controllers\Api\SmtpCredentialController::class, 'update']);
    });
    Route::middleware('page_action:Settings,delete')->group(function () {
        Route::delete('/{id}', [\App\Http\Controllers\Api\SmtpCredentialController::class, 'destroy']);
    });
});

Route::middleware('auth:sanctum')->prefix('suppressions')->group(function () {
    Route::middleware('page_action:Settings,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\SuppressionController::class, 'index']);
    });
    Route::middleware('page_action:Settings,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\SuppressionController::class, 'store']);
    });
    Route::middleware('page_action:Settings,delete')->group(function () {
        Route::delete('/{id}', [\App\Http\Controllers\Api\SuppressionController::class, 'destroy']);
    });
});

Route::middleware('auth:sanctum')->prefix('admin/kym')->group(function () {
    Route::get('/organizations', [\App\Http\Controllers\Api\Admin\KymConsoleController::class, 'index']);
    Route::post('/organizations/{id}/update', [\App\Http\Controllers\Api\Admin\KymConsoleController::class, 'update']);
});

Route::middleware('auth:sanctum')->prefix('automations')->group(function () {
    Route::middleware('page_action:Automation,view')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'index']);
        Route::get('/{automation}', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'show']);
    });
    Route::middleware('page_action:Automation,create')->group(function () {
        Route::post('/', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'store']);
    });
    Route::middleware('page_action:Automation,edit')->group(function () {
        Route::patch('/{automation}', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'update']);
        Route::post('/{automation}/toggle', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'toggle']);
    });
    Route::middleware('page_action:Automation,delete')->group(function () {
        Route::delete('/{automation}', [\App\Http\Controllers\Api\TriggerAutomationController::class, 'destroy']);
    });
});

Route::prefix('founder')->group(function () {
    Route::get('metrics', [\App\Http\Controllers\Api\FounderController::class, 'metrics']);
    Route::post('run-command', [\App\Http\Controllers\Api\FounderController::class, 'runCommand']);
    Route::post('retry-failed-job', [\App\Http\Controllers\Api\FounderController::class, 'retryFailedJob']);
    Route::post('delete-failed-job', [\App\Http\Controllers\Api\FounderController::class, 'deleteFailedJob']);
    Route::post('flush-queue', [\App\Http\Controllers\Api\FounderController::class, 'flushQueue']);
});

Route::middleware('auth:sanctum')->prefix('auth-permissions')->group(function () {
    Route::middleware('page_action:Settings,view')->group(function () {
        // Pages
        Route::get('pages', [AuthPermissionController::class, 'getPages']);
        // Actions
        Route::get('actions', [AuthPermissionController::class, 'getActions']);
        // Roles
        Route::get('roles', [AuthPermissionController::class, 'getRoles']);
        // User Roles assignment
        Route::get('users/{user}/roles', [AuthPermissionController::class, 'getUserRoles']);
    });

    Route::middleware('page_action:Settings,edit')->group(function () {
        // Pages
        Route::post('pages', [AuthPermissionController::class, 'storePage']);
        Route::put('pages/{page}', [AuthPermissionController::class, 'updatePage']);
        Route::delete('pages/{page}', [AuthPermissionController::class, 'destroyPage']);

        // Actions
        Route::post('actions', [AuthPermissionController::class, 'storeAction']);
        Route::put('actions/{action}', [AuthPermissionController::class, 'updateAction']);
        Route::delete('actions/{action}', [AuthPermissionController::class, 'destroyAction']);

        // Page Action mapping
        Route::post('page-actions', [AuthPermissionController::class, 'assignPageAction']);
        Route::delete('page-actions/{pageAction}', [AuthPermissionController::class, 'removePageAction']);

        // Roles
        Route::post('roles', [AuthPermissionController::class, 'storeRole']);
        Route::put('roles/{role}', [AuthPermissionController::class, 'updateRole']);
        Route::delete('roles/{role}', [AuthPermissionController::class, 'destroyRole']);

        // Role Permissions mapping (Page Actions)
        Route::post('roles/{role}/permissions', [AuthPermissionController::class, 'assignRolePermissions']);

        // User Roles assignment
        Route::post('users/{user}/roles', [AuthPermissionController::class, 'assignUserRoles']);
    });
});
