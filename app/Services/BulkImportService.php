<?php

namespace App\Services;

use App\Models\Recipient;
use App\Services\RecipientValidationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BulkImportService
{
    protected RecipientValidationService $validator;

    public function __construct(RecipientValidationService $validator)
    {
        $this->validator = $validator;
    }

    /**
     * Process uploaded CSV file for bulk recipient import.
     */
    public function importFromCsv(
        $csvPath,
        int $agentId,
        ?int $organizationId,
        ?int $campaignId = null
    ): array {
        $results = [
            'new' => 0,
            'updated' => 0,
            'skipped' => 0,
            'invalid' => 0,
            'csv_duplicates' => [],
            'errors' => []
        ];

        $csvEmails = []; // track CSV dups

        $file = fopen($csvPath, 'r');
        if (!$file) {
            return $results;
        }

        fgetcsv($file); // header

        while (($row = fgetcsv($file, 1000, ',')) !== false) {
            if (count($row) < 3) continue;

            $email = trim($row[0]);
            if (isset($csvEmails[$email])) {
                $results['csv_duplicates'][] = $email;
                continue;
            }
            $csvEmails[$email] = true;

            $name = trim($row[1]);
            $phone = trim($row[2]);

            $optional = array_slice($row, 3);
            $additionalDetail = [];
            $optionalKeys = ['gender', 'age', 'city', 'source'];
            foreach ($optionalKeys as $index => $key) {
                if (isset($optional[$index]) && trim($optional[$index]) !== '') {
                    $additionalDetail[$key] = trim($optional[$index]);
                }
            }

            $rowData = [
                'campaign_id' => $campaignId,
                'organization_id' => $organizationId,
                'agent_id' => $agentId,
                'email' => $email,
                'name' => $name,
                'phone' => $phone,
                'additional_detail' => !empty($additionalDetail) ? $additionalDetail : null,
                'is_valid' => true,
                'validation_reason' => null
            ];

            // Validate
            [$isValid, $reason] = $this->validator->bulkValidate($rowData);
            if (!$isValid) {
                $results['invalid']++;
                $results['errors'][] = "Email {$email}: {$reason}";
                continue;
            }

            // Check existing for agent
            $existing = Recipient::forAgent($agentId)->where('email', $email)->first();

            if ($existing) {
                // Compare additional_detail
                $currentDetail = $existing->additional_detail ?: [];
                if ($currentDetail !== $rowData['additional_detail']) {
                    $existing->update([
                        'name' => $rowData['name'],
                        'phone' => $rowData['phone'],
                        'additional_detail' => $rowData['additional_detail'],
                        'campaign_id' => $rowData['campaign_id'],
                    ]);
                    $results['updated']++;
                } else {
                    $results['skipped']++;
                }
            } else {
                Recipient::create($rowData);
                $results['new']++;
            }
        }

        fclose($file);

        Log::info('Bulk import with dedup completed', ['agent_id' => $agentId, 'results' => $results]);

        return $results;
    }
}

