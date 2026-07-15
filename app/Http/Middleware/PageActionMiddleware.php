<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PageActionMiddleware
{
    public function handle(Request $request, Closure $next, string $page, string $action): Response
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if (!$user->hasAuthPermission($page, $action)) {
            abort(403, 'Insufficient page action permissions.');
        }

        return $next($request);
    }
}
