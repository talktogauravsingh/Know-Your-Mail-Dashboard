<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BillingService;
use App\Services\Payments\PaymentService;

class ProcessSubscriptionRenewalsCommand extends Command
{
    protected $signature = 'billing:process-renewals';

    protected $description = 'Process due subscription renewals';

    public function handle(BillingService $billingService, PaymentService $paymentService): int
    {
        $this->info('Processing due subscription renewals...');
        $billingService->processDueRenewals($paymentService);
        $this->info('Completed processing due subscription renewals.');
        return self::SUCCESS;
    }
}
