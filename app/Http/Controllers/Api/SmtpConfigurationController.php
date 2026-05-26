<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmtpConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class SmtpConfigurationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $organizationId = $request->user()->organization_id;
        
        $configurations = SmtpConfiguration::where('organization_id', $organizationId)
            ->get()
            ->map(function ($config) {
                // Do not send password back to frontend
                $config->password = $config->password ? true : false;
                return $config;
            });

        return response()->json($configurations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'provider' => ['required', 'string', 'max:255'],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl'],
            'from_name' => ['required', 'string', 'max:255'],
            'from_address' => ['required', 'email', 'max:255'],
            'is_global' => ['boolean']
        ]);

        $organizationId = $request->user()->organization_id;

        $data = $request->all();
        $data['organization_id'] = $organizationId;

        $configuration = SmtpConfiguration::create($data);

        return response()->json([
            'message' => 'SMTP configuration created successfully',
            'data' => clone $configuration,
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, SmtpConfiguration $smtpConfiguration)
    {
        // Ensure user belongs to the same organization
        if ($request->user()->organization_id !== $smtpConfiguration->organization_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'provider' => ['sometimes', 'required', 'string', 'max:255'],
            'host' => ['sometimes', 'required', 'string', 'max:255'],
            'port' => ['sometimes', 'required', 'integer'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl'],
            'from_name' => ['sometimes', 'required', 'string', 'max:255'],
            'from_address' => ['sometimes', 'required', 'email', 'max:255'],
            'is_global' => ['boolean']
        ]);

        $data = $request->except(['password']);
        
        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $smtpConfiguration->update($data);

        return response()->json([
            'message' => 'SMTP configuration updated successfully',
            'data' => clone $smtpConfiguration,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, SmtpConfiguration $smtpConfiguration)
    {
        // Ensure user belongs to the same organization
        if ($request->user()->organization_id !== $smtpConfiguration->organization_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $smtpConfiguration->delete();

        return response()->json([
            'message' => 'SMTP configuration deleted successfully'
        ]);
    }

    /**
     * Activate the specified resource and deactivate all others for this organization.
     */
    public function activate(Request $request, SmtpConfiguration $smtpConfiguration)
    {
        $organizationId = $request->user()->organization_id;

        // Ensure user belongs to the same organization
        if ($organizationId !== $smtpConfiguration->organization_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Deactivate all other SMTP configurations for this organization
        SmtpConfiguration::where('organization_id', $organizationId)
            ->where('id', '!=', $smtpConfiguration->id)
            ->update(['status' => 0]);

        // Activate the selected configuration
        $smtpConfiguration->update(['status' => 1]);

        return response()->json([
            'message' => 'SMTP configuration activated successfully',
            'data' => $smtpConfiguration
        ]);
    }
}
