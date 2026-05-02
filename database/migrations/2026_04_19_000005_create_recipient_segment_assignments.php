<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Maps each recipient to exactly ONE segment (variant) per campaign.
        // Populated by AssignSegmentsJob before sending.
        // The UNIQUE key enforces the "1 user → 1 segment" invariant at DB level.
        Schema::create('recipient_segment_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('recipient_id');
            $table->unsignedBigInteger('variant_id'); // the winning segment
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            // Guarantees no recipient can be assigned to two segments in same campaign
            $table->unique(['campaign_id', 'recipient_id'], 'uq_campaign_recipient');
            $table->index(['campaign_id', 'variant_id'], 'idx_rsa_campaign_variant');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipient_segment_assignments');
    }
};
