<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SenderDomain;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;

class SenderDomainController extends Controller
{
    /**
     * List all domains for the authenticated organization.
     */
    public function index(Request $request)
    {
        $domains = SenderDomain::where('organization_id', $request->user()->organization_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($d) => $this->formatDomain($d));

        return response()->json($domains);
    }

    /**
     * Add a new domain and generate its DNS records.
     */
    public function store(Request $request)
    {
        $orgId = (int) $request->user()->organization_id;
        $quota = app(\App\Services\FeatureGateService::class)->checkQuota('custom_domain', $orgId);
        if (!$quota['has_access']) {
            return response()->json([
                'error' => 'feature_locked',
                'message' => 'Custom Domain verification is not included in your current plan. Please upgrade.'
            ], 403);
        }

        if ($quota['remaining'] !== null) {
            $existingCount = SenderDomain::where('organization_id', $orgId)->count();
            if ($existingCount >= $quota['remaining']) {
                return response()->json([
                    'error' => 'quota_exceeded',
                    'message' => "You have reached the maximum limit of {$quota['remaining']} custom domains for your plan. Please upgrade to add more."
                ], 403);
            }
        }

        $request->validate([
            'domain' => [
                'required',
                'string',
                'max:253',
                'regex:/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/',
                function ($attribute, $value, $fail) {
                    $exists = SenderDomain::where('domain', strtolower($value))->exists();
                    if ($exists) {
                        $fail('This domain has already been registered by another organization.');
                    }
                },
            ],
        ]);

        $appHost = config('app.tracking_domain', parse_url(config('app.url'), PHP_URL_HOST));

        // Generate RSA 2048-bit keypair
        $config = [
            "digest_alg" => "sha256",
            "private_key_bits" => 2048,
            "private_key_type" => OPENSSL_KEYTYPE_RSA,
        ];
        $pkey = openssl_pkey_new($config);
        openssl_pkey_export($pkey, $privateKeyPem);
        $pubKeyDetails = openssl_pkey_get_details($pkey);
        $publicKeyPem = $pubKeyDetails["key"];

        // Format public key for DNS TXT: strip PEM tags, newlines and spaces
        $publicKeyClean = preg_replace('/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\r|\n|\s+/', '', $publicKeyPem);

        $domain = SenderDomain::create([
            'organization_id' => $request->user()->organization_id,
            'domain'          => strtolower($request->domain),
            'status'          => 'pending',
            'cname_target'    => $appHost,
            'dkim_selector'   => 'kym',
            'dkim_public_key' => $publicKeyClean,
            'dkim_private_key'=> $privateKeyPem,
        ]);

        return response()->json($this->formatDomain($domain), 201);
    }

    /**
     * Delete a domain owned by the authenticated organization.
     */
    public function destroy(Request $request, int $id)
    {
        $domain = SenderDomain::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $domain->delete();

        return response()->json(['message' => 'Domain removed successfully.']);
    }

    /**
     * Trigger a DNS verification check for a domain.
     */
    public function verify(Request $request, int $id)
    {
        $senderDomain = SenderDomain::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $appHost = config('app.tracking_domain', parse_url(config('app.url'), PHP_URL_HOST));

        // DNS checks
        $spfVerified   = $this->checkSpf($senderDomain->domain);
        $dkimVerified  = $this->checkDkim($senderDomain->domain, $senderDomain->dkim_selector);
        $dmarcVerified = $this->checkDmarc($senderDomain->domain);
        $cnameVerified = $this->checkCname($senderDomain->domain, $appHost);

        // CNAME verification is optional for email relay/sending, but SPF, DKIM, and DMARC are required
        $fullyVerified = $spfVerified && $dkimVerified && $dmarcVerified;

        $senderDomain->update([
            'spf_verified'   => $spfVerified,
            'dkim_verified'  => $dkimVerified,
            'dmarc_verified' => $dmarcVerified,
            'cname_verified' => $cnameVerified,
            'cname_target'   => $cnameVerified ? $appHost : $senderDomain->cname_target,
            'status'         => $fullyVerified ? 'verified' : 'pending',
            'verified_at'    => $fullyVerified ? now() : null,
        ]);

        return response()->json($this->formatDomain($senderDomain->fresh()));
    }

    /**
     * Provision DNS records directly in Cloudflare.
     */
    public function provisionCloudflare(Request $request, int $id)
    {
        $request->validate([
            'cloudflare_api_token' => ['required', 'string'],
            'cloudflare_zone_id'   => ['nullable', 'string'],
        ]);

        $domain = SenderDomain::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $apiToken = $request->cloudflare_api_token;
        $zoneId = $request->cloudflare_zone_id;
        $domainName = $domain->domain;

        $appHost = config('app.tracking_domain', parse_url(config('app.url'), PHP_URL_HOST));

        try {
            // 1. Resolve Zone ID if not provided
            if (!$zoneId) {
                $response = Http::withToken($apiToken)
                    ->get("https://api.cloudflare.com/client/v4/zones?name=" . $domainName);

                if (!$response->successful() || count($response->json('result') ?? []) === 0) {
                    // Try getting base domain zone if it's a subdomain
                    $parts = explode('.', $domainName);
                    if (count($parts) > 2) {
                        $baseDomain = implode('.', array_slice($parts, -2));
                        $response = Http::withToken($apiToken)
                            ->get("https://api.cloudflare.com/client/v4/zones?name=" . $baseDomain);
                    }
                }

                if (!$response->successful() || count($response->json('result') ?? []) === 0) {
                    return response()->json(['message' => 'Cloudflare Zone could not be resolved for domain ' . $domainName], 422);
                }

                $zoneId = $response->json('result.0.id');
            }

            // Define DNS records to create
            $records = [
                // Tracking CNAME: em.domain.com -> appHost
                [
                    'type' => 'CNAME',
                    'name' => 'em',
                    'content' => $appHost,
                    'proxied' => false,
                    'ttl' => 3600
                ],
                // SPF Record: TXT @ -> v=spf1 include:appHost ~all
                [
                    'type' => 'TXT',
                    'name' => '@',
                    'content' => 'v=spf1 include:' . $appHost . ' ~all',
                    'ttl' => 3600
                ],
                // DKIM Record: TXT selector._domainkey -> v=DKIM1; k=rsa; p=public_key
                [
                    'type' => 'TXT',
                    'name' => $domain->dkim_selector . '._domainkey',
                    'content' => 'v=DKIM1; k=rsa; p=' . $domain->dkim_public_key,
                    'ttl' => 3600
                ],
                // DMARC Record: TXT _dmarc -> v=DMARC1; p=none; rua=mailto:dmarc@appHost
                [
                    'type' => 'TXT',
                    'name' => '_dmarc',
                    'content' => 'v=DMARC1; p=none; rua=mailto:dmarc@' . $appHost,
                    'ttl' => 3600
                ]
            ];

            foreach ($records as $recordData) {
                $dnsRes = Http::withToken($apiToken)
                    ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/dns_records", $recordData);

                if (!$dnsRes->successful()) {
                    // Check if error is 'record already exists' (code 81057)
                    $errors = $dnsRes->json('errors') ?? [];
                    $isDuplicate = false;
                    foreach ($errors as $err) {
                        if ($err['code'] === 81057) {
                            $isDuplicate = true;
                            break;
                        }
                    }
                    if (!$isDuplicate) {
                        // Log or return error if not duplicate
                        Log::warning("Failed to create DNS record in Cloudflare: " . $dnsRes->body());
                    }
                }
            }

            // Trigger verify check after record injection
            return $this->verify($request, $id);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Cloudflare integration failed: ' . $e->getMessage()], 500);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function formatDomain(SenderDomain $d): array
    {
        return [
            'id'           => $d->id,
            'domain'       => $d->domain,
            'status'       => $d->status,
            'spf_verified' => $d->spf_verified,
            'dkim_verified'=> $d->dkim_verified,
            'dmarc_verified'=> $d->dmarc_verified,
            'cname_verified'=> $d->cname_verified,
            'verified_at'  => $d->verified_at?->format('M d, Y'),
            'dns_records'  => $d->getDnsRecords(),
            'created_at'   => $d->created_at->format('M d, Y'),
        ];
    }

    private function checkSpf(string $domain): bool
    {
        try {
            $records = dns_get_record($domain, DNS_TXT);
            foreach ($records as $record) {
                if (isset($record['txt']) && str_contains($record['txt'], 'v=spf1')) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failure
        }
        return false;
    }

    private function checkDkim(string $domain, string $selector): bool
    {
        try {
            $host    = $selector . '._domainkey.' . $domain;
            $records = dns_get_record($host, DNS_TXT);
            foreach ($records as $record) {
                if (isset($record['txt']) && str_contains($record['txt'], 'v=DKIM1')) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failure
        }
        return false;
    }

    private function checkDmarc(string $domain): bool
    {
        try {
            $host    = '_dmarc.' . $domain;
            $records = dns_get_record($host, DNS_TXT);
            foreach ($records as $record) {
                if (isset($record['txt']) && str_contains($record['txt'], 'v=DMARC1')) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failure
        }
        return false;
    }

    private function checkCname(string $domain, string $expectedTarget): bool
    {
        try {
            $host = 'em.' . $domain;
            $records = dns_get_record($host, DNS_CNAME);
            foreach ($records as $record) {
                if (isset($record['target']) && strtolower(rtrim($record['target'], '.')) === strtolower(rtrim($expectedTarget, '.'))) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // DNS lookup failure
        }
        return false;
    }
}
