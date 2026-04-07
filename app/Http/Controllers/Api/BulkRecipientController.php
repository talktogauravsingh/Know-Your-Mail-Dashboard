<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        
        // Assume agent role check via middleware or permission
        // if (!$user->hasPermission('bulk_upload_recipients')) {
        //     return response()->json(['error' => 'Unauthorized'], 403);
        // }

        $request->validate([
            'file' => 'required|file|mimes:csv|max:10240', // 10MB
            'campaign_id' => 'nullable|integer|exists:campaigns,id'
        ]);

        if (!$request->file('file')) {
            throw ValidationException::withMessages(['file' => 'CSV file required']);
        }

        $campaignId = $request->input('campaign_id');
        $organizationId = $user->organization_id;
        $agentId = $user->id;

        // Store temp file
        $csvPath = $request->file('file')->store('temp_csv', 'local');
        $fullPath = storage_path('app/' . $csvPath);

        try {
            $results = $this->bulkImportService->importFromCsv(
                $fullPath,
                $agentId,
                $organizationId,
                $campaignId
            );

            // Cleanup
            Storage::disk('local')->delete($csvPath);

            return response()->json([
                'success' => true,
                'message' => 'Bulk upload with deduplication completed.',
                'summary' => [
                    'new' => $results['new'] ?? 0,
                    'updated' => $results['updated'] ?? 0,
                    'skipped' => $results['skipped'] ?? 0,
                    'invalid' => $results['invalid'] ?? 0,
                    'csv_duplicates' => count($results['csv_duplicates'] ?? []),
                ],
                'details' => $results
            ], 200);
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

