<?php

namespace App\Services\Spam;

class SpamScoreAggregator
{
    public function aggregate(array $scores, array $weights = []): float
    {
        // Simple weighted average example
        // In real system, this would be highly tuned
        $totalWeight = 0;
        $totalScore = 0;

        foreach ($scores as $key => $score) {
            $weight = $weights[$key] ?? 1.0;
            $totalScore += ($score * $weight);
            $totalWeight += $weight;
        }

        return $totalWeight > 0 ? min(1.0, $totalScore / $totalWeight) : 0.0;
    }
}
