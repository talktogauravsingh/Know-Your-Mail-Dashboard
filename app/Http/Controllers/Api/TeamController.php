<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Repositories\AuthRepository;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules;

class TeamController extends Controller
{
    protected AuthRepository $authRepo;

    public function __construct(AuthRepository $authRepo)
    {
        $this->authRepo = $authRepo;
    }

    /**
     * List all members in the authenticated user's organization.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $members = User::where('organization_id', $user->organization_id)
            ->with('role:id,name,slug')
            ->orderBy('created_at')
            ->get()
            ->map(fn($member) => [
                'id'         => $member->id,
                'name'       => $member->name,
                'email'      => $member->email,
                'role'       => $member->role?->name ?? 'Member',
                'role_slug'  => $member->role?->slug ?? 'user',
                'is_self'    => $member->id === $user->id,
                'joined_at'  => $member->created_at->format('M d, Y'),
            ]);

        return response()->json($members);
    }

    /**
     * Invite a new team member (creates a manager under the current org).
     */
    public function invite(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9\s\-_,\.\(\)\'\"]+$/'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'              => ['required', 'confirmed', Rules\Password::defaults()],
            'role_id'               => ['required', 'exists:roles,id'],
            'permission_slugs'      => ['nullable', 'array'],
            'permission_slugs.*'    => ['exists:permissions,slug'],
        ]);

        try {
            $manager = $this->authRepo->createManager($validated, $user);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'id'        => $manager->id,
            'name'      => $manager->name,
            'email'     => $manager->email,
            'role'      => $manager->role?->name ?? 'Member',
            'role_slug' => $manager->role?->slug ?? 'user',
            'is_self'   => false,
            'joined_at' => $manager->created_at->format('M d, Y'),
        ], 201);
    }

    /**
     * Remove a team member from the organization.
     * Cannot remove yourself or a member from a different organization.
     */
    public function remove(Request $request, int $memberId)
    {
        $user = $request->user();

        if ($user->id === $memberId) {
            return response()->json(['message' => 'You cannot remove yourself.'], 422);
        }

        $member = User::where('id', $memberId)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        // Revoke all tokens before deleting
        $member->tokens()->delete();
        $member->delete();

        return response()->json(['message' => 'Team member removed successfully.']);
    }
}
