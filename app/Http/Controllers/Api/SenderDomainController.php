<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SenderDomain;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
        $request->validate([
            'domain' => [
                'required',
                'string',
                'max:253',
                'regex:/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/',
                function ($attribute, $value, $fail) use ($request) {
                    $exists = SenderDomain::where('organization_id', $request->user()->organization_id)
                        ->where('domain', strtolower($value))
                        ->exists();
                    if ($exists) {
                        $fail('This domain has already been added.');
                    }
                },
            ],
        ]);

        $appHost = config('app.tracking_domain', parse_url(config('app.url'), PHP_URL_HOST));

        $domain = SenderDomain::create([
            'organization_id' => $request->user()->organization_id,
            'domain'          => strtolower($request->domain),
            'status'          => 'pending',
            'cname_target'    => $appHost,
            'dkim_selector'   => 'kym',
            // In production, generate a real RSA keypair and store the private key
            // in a secrets manager; only the public key lives in the DB.
            'dkim_public_key' => $this->generateDkimPublicKeyPlaceholder(),
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
     * In production this would do real DNS lookups (dns_get_record / external API).
     * For now it checks the presence of expected records and marks accordingly.
     */
    public function verify(Request $request, int $id)
    {
        $senderDomain = SenderDomain::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        // ── Real DNS check ───────────────────────────────────────────────────
        $spfVerified   = $this->checkSpf($senderDomain->domain);
        $dkimVerified  = $this->checkDkim($senderDomain->domain, $senderDomain->dkim_selector);
        $dmarcVerified = $this->checkDmarc($senderDomain->domain);

        $fullyVerified = $spfVerified && $dkimVerified && $dmarcVerified;

        $senderDomain->update([
            'spf_verified'   => $spfVerified,
            'dkim_verified'  => $dkimVerified,
            'dmarc_verified' => $dmarcVerified,
            'status'         => $fullyVerified ? 'verified' : 'pending',
            'verified_at'    => $fullyVerified ? now() : null,
        ]);

        return response()->json($this->formatDomain($senderDomain->fresh()));
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
            // DNS lookup failure — treat as not verified
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

    /**
     * Placeholder — replace with a real RSA keygen in production.
     */
    private function generateDkimPublicKeyPlaceholder(): string
    {
        // In production: openssl_pkey_new + openssl_pkey_get_details
        return 'PLACEHOLDER_REPLACE_WITH_REAL_RSA_PUBLIC_KEY_' . strtoupper(Str::random(8));
    }
}
