<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->role_id) {
            $user->load('role.permissions');
        }

        if (! $user->hasAnyPermission($permissions)) {
            abort(403, 'Insufficient permissions.');
        }

        return $next($request);
    }
}
