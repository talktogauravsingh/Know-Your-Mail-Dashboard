<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:import-recipients')]
#[Description('Command description')]
class ImportRecipients extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $file = storage_path('app/emails.csv');
        $campaignId = 1;

        $validator = new \App\Services\RecipientValidationService();

        $rows = array_map('str_getcsv', file($file));

        foreach ($rows as $row) {
            $email = $row[0];

            [$isValid, $reason] = $validator->validate($email);

            \App\Models\Recipient::create([
                'campaign_id' => $campaignId,
                'email' => $email,
                'is_valid' => $isValid,
                'validation_reason' => $reason
            ]);
        }

        $this->info("Import completed");
    }
}
