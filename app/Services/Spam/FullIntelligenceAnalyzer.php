<?php

namespace App\Services\Spam;

use App\DTOs\Spam\FullAnalysisDTO;
use Illuminate\Support\Facades\DB;

class FullIntelligenceAnalyzer
{
    public function __construct(
        private readonly ContentAnalyzer $contentAnalyzer,
        private readonly SPFValidator $spfValidator,
        private readonly DKIMValidator $dkimValidator,
        private readonly DomainReputation $domainReputation,
        private readonly UrlScanner $urlScanner
    ) {}

    public function analyze(FullAnalysisDTO $dto): array
    {
        // Parallelization in PHP is hard natively, but we can simulate gathering data.
        // In a real environment, we might use Laravel Octane or dispatch sub-jobs.

        $spfResult = $this->spfValidator->check($dto->senderDomain, $dto->rawEmail);
        $dkimResult = $this->dkimValidator->check($dto->rawEmail);
        $domainRep = $this->domainReputation->check($dto->senderDomain);
        
        // Extract content from raw email (simplified for MVP)
        // A real system would use a mime parser here.
        $contentDto = new \App\DTOs\Spam\ContentAnalysisDTO($dto->rawEmail, "Extracted Subject");
        $contentResult = $this->contentAnalyzer->analyze($contentDto);

        // Scan URLs found in content
        $urls = $this->extractUrls($dto->rawEmail);
        $urlReputations = $this->urlScanner->scanBatch($urls);

        // Analyze Headers
        $headerAnalysis = $this->analyzeHeaders($dto->headers);

        // Aggregate results
        $finalScore = $this->aggregateScore($spfResult, $dkimResult, $domainRep, $contentResult, $urlReputations, $headerAnalysis);

        $threatType = $finalScore > 0.8 ? 'spam' : 'clean';
        if ($domainRep['age_days'] < 30 || in_array('malicious', array_column($urlReputations, 'status'))) {
            $threatType = 'phishing';
        }

        $result = [
            'final_spam_score' => round($finalScore, 4),
            'threat_type' => $threatType,
            'spf' => $spfResult,
            'dkim' => $dkimResult,
            'dmarc' => 'missing', // Simplification
            'domain_age_days' => $domainRep['age_days'],
            'reasons' => array_merge($contentResult['reasons'], $domainRep['warnings'] ?? [], $headerAnalysis['reasons']),
            'risk_breakdown' => [
                'content_score' => $contentResult['spam_score'],
                'domain_reputation' => $domainRep['score'],
                'authentication_risk' => ($spfResult === 'fail' || $dkimResult === 'fail') ? 1.0 : 0.0,
                'header_risk' => $headerAnalysis['score'],
            ]
        ];

        // Log analysis
        DB::table('spam_analysis_history')->insert([
            'type' => 'full',
            'request_ip' => request()->ip(),
            'payload_hash' => md5($dto->rawEmail),
            'spam_score' => $result['final_spam_score'],
            'classification' => $result['threat_type'],
            'reasons' => json_encode($result['reasons']),
            'raw_response' => json_encode($result),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $result;
    }

    private function extractUrls(string $text): array
    {
        preg_match_all('/https?:\/\/[^\s]+/', $text, $matches);
        return array_unique($matches[0] ?? []);
    }

    private function analyzeHeaders(array $headers): array
    {
        $score = 0.0;
        $reasons = [];

        if (isset($headers['X-Mailer'])) {
            $mailer = strtolower($headers['X-Mailer']);
            // Known bulk or suspicious mailers
            $suspiciousMailers = ['bulksender', 'php/mail()', 'massmailer', 'unknown'];
            foreach ($suspiciousMailers as $sus) {
                if (str_contains($mailer, $sus)) {
                    $score += 0.4;
                    $reasons[] = "Suspicious X-Mailer header detected: {$headers['X-Mailer']}";
                    break;
                }
            }
        }

        if (isset($headers['X-PHP-Originating-Script'])) {
            $score += 0.2;
            $reasons[] = "Email originated from a raw PHP script";
        }

        return [
            'score' => min(1.0, $score),
            'reasons' => $reasons,
        ];
    }

    private function aggregateScore($spf, $dkim, $domain, $content, $urls, $headers): float
    {
        $score = $content['spam_score'] * 0.4;
        
        if ($spf === 'fail' || $dkim === 'fail') {
            $score += 0.3;
        }

        if ($domain['age_days'] < 30) {
            $score += 0.1;
        }

        $score += ($headers['score'] * 0.2); // Add header risk factor

        foreach ($urls as $url) {
            if ($url['status'] === 'malicious') {
                $score += 0.5;
                break;
            }
        }

        return min(1.0, $score);
    }
}
