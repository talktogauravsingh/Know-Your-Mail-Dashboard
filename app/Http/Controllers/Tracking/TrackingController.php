<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Http\Services\Tracking\TrackingService;
use Illuminate\Http\Request;

class TrackingController extends Controller
{

    public $trackingService;

    public function __construct(TrackingService $trackingService)
    {
        $this->trackingService = $trackingService;
    }

    public function OpenMailTrack(Request $request)
    {
        $base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

        $image = base64_decode($base64);

        return response($image, 200)
            ->header('Content-Type', 'image/png')
            ->header('Content-Length', strlen($image))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }
}
