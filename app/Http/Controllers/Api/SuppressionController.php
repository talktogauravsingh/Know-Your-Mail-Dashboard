<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Suppression;
use Illuminate\Http\Request;

class SuppressionController extends Controller
{
    /**
     * Display a listing of suppressions.
     */
    public function index(Request $request)
    {
        $organizationId = $request->user()->organization_id;
        $limit = $request->query('limit', 25);
        $search = $request->query('search');

        $query = Suppression::where('organization_id', $organizationId);

        if ($search) {
            $query->where('email', 'like', '%' . strtolower(trim($search)) . '%');
        }

        $paginator = $query->orderByDesc('created_at')->paginate($limit);

        return response()->json([
            'items' => $paginator->items(),
            'total' => $paginator->total(),
        ]);
    }

    /**
     * Store a newly created suppression manually.
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'reason' => ['required', 'string', 'in:manual,bounce,complaint'],
        ]);

        $organizationId = $request->user()->organization_id;

        $suppression = Suppression::suppress(
            $organizationId,
            $request->email,
            $request->reason
        );

        return response()->json($suppression, 201);
    }

    /**
     * Remove the specified suppression.
     */
    public function destroy(Request $request, int $id)
    {
        $suppression = Suppression::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $suppression->delete();

        return response()->json(['message' => 'Suppression removed successfully.']);
    }
}
