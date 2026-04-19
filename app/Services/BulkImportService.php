<?php

namespace App\Services;

use App\Jobs\ProcessCsvImportJob;
use Illuminate\Support\Facades\Log;

class BulkImportService
{
    /**
     * Dispatch uploaded CSV file to a background job for bulk recipient import.
     */
    public function importFromCsv(
        $csvPath,
        int $agentId,
        ?int $organizationId,
        ?int $campaignId = null
    ): array {
        // Dispatch the background job
        ProcessCsvImportJob::dispatch($csvPath, $agentId, $organizationId, $campaignId);

        Log::info('Bulk import job dispatched', [
            'agent_id' => $agentId,
            'csvPath' => $csvPath
        ]);

        return [
            'status' => 'queued',
            'message' => 'Your file is being processed in the background. Insights and results will be available shortly.',
        ];
    }
}