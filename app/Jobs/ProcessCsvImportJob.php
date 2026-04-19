<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Services\RecipientValidationService;

class ProcessCsvImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 3600;

    public function __construct(
        public string $filePath,
        public int $agentId,
        public int $organizationId,
        public ?int $campaignId = null
    ) {}

    public function handle(RecipientValidationService $validator): void
    {
        Log::info("Starting CSV import job for org {$this->organizationId}");

        if (!Storage::disk('local')->exists($this->filePath)) {
            Log::error("CSV file not found: {$this->filePath}");
            return;
        }

        $fullPath = Storage::disk('local')->path($this->filePath);
        $file = fopen($fullPath, 'r');
        if (!$file) return;

        $headers = fgetcsv($file);
        if (!$headers) return;
        
        $headers = array_map(fn($h) => strtolower(trim($h)), $headers);
        
        // Read first 50 rows to detect email column reliably
        $sample = [];
        for ($i = 0; $i < 50; $i++) {
            $row = fgetcsv($file);
            if ($row) {
                if (count($headers) === count($row)) {
                    $sample[] = array_combine($headers, $row);
                }
            } else {
                break;
            }
        }
        
        $emailColumn = $this->detectEmailColumn($sample) ?? 'email';
        
        rewind($file);
        fgetcsv($file); // skip header
        
        $chunk = [];
        $chunkSize = 1000;
        $stats = []; // For 100% accurate insights
        
        while (($row = fgetcsv($file, 4000, ',')) !== false) {
            if (count($headers) !== count($row)) continue;
            $rowAssoc = array_combine($headers, $row);
            
            $email = strtolower(trim($rowAssoc[$emailColumn] ?? ''));
            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) continue;
            
            $attributes = [];
            foreach ($rowAssoc as $key => $value) {
                $value = strtolower(trim($value));
                if ($value === '') continue;
                
                if (!isset($stats[$key][$value])) {
                    $stats[$key][$value] = 0;
                }
                $stats[$key][$value]++;
                
                if (in_array($key, [$emailColumn, 'name', 'phone'])) continue;
                $attributes[$key] = $value;
            }
            
            $rowData = [
                'organization_id' => $this->organizationId,
                'agent_id' => $this->agentId,
                'email' => $email,
                'name' => $rowAssoc['name'] ?? null,
                'is_valid' => true,
                'attributes' => json_encode($attributes),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            $chunk[] = $rowData;
            
            if (count($chunk) >= $chunkSize) {
                $this->upsertChunk($chunk);
                $chunk = [];
            }
        }
        
        if (!empty($chunk)) {
            $this->upsertChunk($chunk);
        }
        
        fclose($file);
        
        // Generate 100% accurate insights
        $insights = [];
        foreach ($stats as $col => $values) {
            $uniqueCount = count($values);
            // Sort by frequency (highest first) to keep distribution relevant
            arsort($values);
            
            $insights[$col] = [
                'unique_count' => $uniqueCount,
                'distribution' => array_slice($values, 0, 50, true), // store top 50 distributions
                'recommended' => $uniqueCount >= 2 && $uniqueCount <= 10,
                'type' => $uniqueCount <= 20 ? 'categorical' : 'text'
            ];
        }
        
        Log::info("Completed CSV import job for org {$this->organizationId}", ['insights' => $insights]);
        
        // Save insights to DB
        foreach ($insights as $col => $data) {
            DB::table('campaign_csv_insights')->updateOrInsert(
                [
                    'campaign_id' => $this->campaignId,
                    'organization_id' => $this->organizationId,
                    'field_name' => $col
                ],
                [
                    'unique_count' => $data['unique_count'],
                    'distribution' => json_encode($data['distribution']),
                    'is_recommended' => $data['recommended'] ? 1 : 0,
                    'field_type' => $data['type'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
        
        Storage::disk('local')->delete($this->filePath);
    }
    
    private function upsertChunk(array $chunk)
    {
        DB::table('recipients')->upsert(
            $chunk,
            ['organization_id', 'email'],
            ['name', 'attributes', 'updated_at']
        );
    }

    private function detectEmailColumn(array $sample): ?string
    {
        $scores = [];
        foreach ($sample as $row) {
            foreach ($row as $key => $value) {
                if (filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $scores[$key] = ($scores[$key] ?? 0) + 1;
                }
            }
        }
        arsort($scores);
        return key($scores);
    }
}
