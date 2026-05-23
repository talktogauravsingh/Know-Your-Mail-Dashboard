<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Services\BulkImportService;
use App\Services\RecipientValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class BulkRecipientController extends Controller
{
    public function __construct(
        private BulkImportService $bulkImportService,
        private RecipientValidationService $validator
    ) {}

    /**
     * Bulk upload recipients from CSV.
     * Expects CSV: email,name,phone,gender,age,city,source
     */
    public function bulkUpload(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB
            'campaign_id' => 'nullable|integer|exists:campaigns,id',
            'module_type' => 'nullable|integer|in:1,2',
            'module_id' => 'nullable|integer'
        ]);

        if (!$request->file('file')) {
            throw ValidationException::withMessages(['file' => 'CSV file required']);
        }

        $campaignId = $request->input('campaign_id');
        $moduleType = $request->input('module_type');
        $moduleId = $request->input('module_id');

        if ($campaignId) {
            Campaign::where('organization_id', $user->organization_id)->findOrFail($campaignId);
        }

        // Logic for module referencing
        if (!$moduleType) {
            $moduleType = $campaignId ? 2 : 1; // Default to Campaign if id exists, else Org
        }
        
        if (!$moduleId) {
            $moduleId = $campaignId ?: $user->organization_id;
        }

        if ((int) $moduleType === 1 && (int) $moduleId !== (int) $user->organization_id) {
            return response()->json(['message' => 'Organization uploads must target your organization.'], 422);
        }

        if ((int) $moduleType === 2) {
            Campaign::where('organization_id', $user->organization_id)->findOrFail($moduleId);
        }
        
        $organizationId = $user->organization_id;
        $agentId = $user->id;

        // Store temp file
        $csvPath = $request->file('file')->store('temp_csv', 'local');
        $fullPath = Storage::disk('local')->path($csvPath);

        // ── Quick synchronous pre-scan ─────────────────────────────────────
        // Read headers + first 5 rows for the UI preview, and count totals.
        // This is fast (<10ms) — the heavy DB upsert still runs in the job.
        $previewRows  = [];
        $totalRows    = 0;
        $validRows    = 0;
        $invalidRows  = 0;
        $csvHeaders   = [];
        $previewLimit = 5;

        if (($fh = fopen($fullPath, 'r')) !== false) {
            $rawHeaders = fgetcsv($fh);
            if ($rawHeaders) {
                $csvHeaders = array_map(fn($h) => strtolower(trim($h)), $rawHeaders);
            }

            while (($row = fgetcsv($fh, 4000, ',')) !== false) {
                if (count($csvHeaders) !== count($row)) continue;
                $totalRows++;
                $assoc = array_combine($csvHeaders, $row);

                // Find the email value heuristically (first column containing @)
                $emailValue = '';
                foreach ($assoc as $val) {
                    if (str_contains((string)$val, '@')) { $emailValue = trim($val); break; }
                }

                $isValid = $emailValue && filter_var($emailValue, FILTER_VALIDATE_EMAIL);
                $isValid ? $validRows++ : $invalidRows++;

                if (count($previewRows) < $previewLimit) {
                    $previewRows[] = $assoc;
                }
            }
            fclose($fh);
        }
        // ──────────────────────────────────────────────────────────────────

        try {
            $results = $this->bulkImportService->importFromCsv(
                $csvPath,
                $agentId,
                $organizationId,
                $campaignId,
                $moduleType,
                $moduleId
            );

            return response()->json([
                'success'      => true,
                'message'      => 'Bulk upload has been queued for processing.',
                'total_rows'   => $totalRows,
                'valid_rows'   => $validRows,
                'invalid_rows' => $invalidRows,
                'headers'      => $csvHeaders,
                'preview_rows' => $previewRows,
                'details'      => $results,
            ], 202);
        } catch (\Exception $e) {
            Log::error('Bulk upload failed: ' . $e->getMessage());
            Storage::disk('local')->delete($csvPath);
            return response()->json([
                'success' => false,
                'message' => 'Upload failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
