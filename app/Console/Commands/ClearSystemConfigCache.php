<?php

namespace App\Console\Commands;

use App\Models\SystemConfig;
use Illuminate\Console\Command;

class ClearSystemConfigCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db-config:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear the cached system configurations stored in MySQL database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        SystemConfig::clearCache();
        $this->info('System configuration cache cleared successfully.');

        return Command::SUCCESS;
    }
}
