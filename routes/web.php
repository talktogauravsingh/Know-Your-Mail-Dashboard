<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\EmailAIController;

Route::post('/ai/generate', [EmailAIController::class, 'generate']);

Route::get('/ai/health', [EmailAIController::class, 'health']);

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
