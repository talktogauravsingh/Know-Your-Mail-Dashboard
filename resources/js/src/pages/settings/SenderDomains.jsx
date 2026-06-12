import React, { useState, useEffect } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { 
    Globe, 
    CheckCircle2, 
    XCircle,
    RefreshCw, 
    Trash2, 
    ChevronDown, 
    ChevronUp, 
    Copy, 
    ShieldCheck, 
    Zap,
    AlertCircle
} from "lucide-react";
import { useStore } from "../../store/useStore";

export default function SenderDomains({ setActiveTab }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newDomainName, setNewDomainName] = useState("");
    const [expandedDomainId, setExpandedDomainId] = useState(null);
    const [copiedField, setCopiedField] = useState("");

    // Cloudflare state
    const [cfToken, setCfToken] = useState("");
    const [cfZoneId, setCfZoneId] = useState("");
    const [cfLoading, setCfLoading] = useState(false);

    const domains = useStore((state) => state.domains);
    const domainsLoading = useStore((state) => state.domainsLoading);
    const fetchDomains = useStore((state) => state.fetchDomains);
    const addDomain = useStore((state) => state.addDomain);
    const deleteDomain = useStore((state) => state.deleteDomain);
    const verifyDomain = useStore((state) => state.verifyDomain);
    const provisionCloudflare = useStore((state) => state.provisionCloudflare);
    const isLoading = useStore((state) => state.isLoading);

    useEffect(() => {
        fetchDomains();
    }, [fetchDomains]);

    const handleAddDomain = async (e) => {
        e.preventDefault();
        if (!newDomainName) return;
        try {
            await addDomain(newDomainName);
            setIsAdding(false);
            setNewDomainName("");
        } catch (err) {
            // Toast handled by store
        }
    };

    const handleCloudflareProvision = async (domainId) => {
        if (!cfToken) return;
        setCfLoading(true);
        try {
            await provisionCloudflare(domainId, {
                cloudflare_api_token: cfToken,
                cloudflare_zone_id: cfZoneId || null,
            });
            setCfToken("");
            setCfZoneId("");
        } catch (err) {
            // Handled by store
        } finally {
            setCfLoading(false);
        }
    };

    const copyText = (text, fieldId) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(""), 2000);
    };

    const VerifyBadge = ({ ok }) => (
        <Badge
            className={`font-semibold text-[10px] uppercase border-none py-0.5 px-2 rounded-full flex items-center gap-1 ${
                ok
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
            }`}
        >
            {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {ok ? "Verified" : "Pending"}
        </Badge>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Sender Domains</CardTitle>
                        <CardDescription>
                            Configure and authenticate domains to enable relaying and tracking.
                        </CardDescription>
                    </div>
                    {!isAdding && (
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Domain
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Next Steps Guidance Banner */}
                    {domains.some(d => d.status === "verified") && (
                        <div className="mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                                        Domain Verified Successfully!
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        To send email campaigns or test messages using your domain, you need to generate SMTP Credentials next.
                                    </p>
                                </div>
                            </div>
                            {setActiveTab && (
                                <Button
                                    size="sm"
                                    onClick={() => setActiveTab("smtp-credentials")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0 text-xs font-semibold"
                                >
                                    Generate SMTP Key →
                                </Button>
                            )}
                        </div>
                    )}

                    {isAdding && (
                        <form
                            onSubmit={handleAddDomain}
                            className="mb-6 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-5 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4"
                        >
                            <div className="max-w-md space-y-2">
                                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Domain Name
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="mail.yourdomain.com"
                                        value={newDomainName}
                                        onChange={(e) => setNewDomainName(e.target.value)}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        isLoading={isLoading}
                                    >
                                        Register
                                    </Button>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setIsAdding(false)}
                            >
                                Cancel
                            </Button>
                        </form>
                    )}

                    {domainsLoading ? (
                        <div className="space-y-3">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-16 w-full bg-slate-100 dark:bg-slate-900/60 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : domains.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                            No sender domains configured yet. Add your first domain to get started.
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                            {domains.map((dom) => {
                                const isExpanded = expandedDomainId === dom.id;
                                const isVerified = dom.status === "verified";

                                return (
                                    <div key={dom.id} className="bg-white dark:bg-slate-950 transition-colors">
                                        {/* Main Row */}
                                        <div className="flex items-center justify-between p-4 flex-wrap gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isVerified ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                                        {dom.domain}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Added on {dom.created_at}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <VerifyBadge ok={isVerified} />

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => verifyDomain(dom.id)}
                                                    className="bg-white dark:bg-slate-950 gap-1.5 h-8 text-xs font-semibold"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Verify
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => {
                                                        if (confirm(`Remove domain "${dom.domain}"? Relaying emails from this domain will fail.`)) {
                                                            deleteDomain(dom.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-600"
                                                    onClick={() => setExpandedDomainId(isExpanded ? null : dom.id)}
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* DNS Detail Panel */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/50 dark:bg-slate-900/40 p-5 border-t border-slate-200 dark:border-slate-800 space-y-6">
                                                {/* DNS Records */}
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                                        Configure DNS Records
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {dom.dns_records.map((rec, index) => {
                                                            const copyId = `${dom.id}-rec-${index}`;
                                                            return (
                                                                <div key={index} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex gap-2 items-center">
                                                                            <span className="font-bold text-xs uppercase tracking-wide bg-slate-100 text-slate-700 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300">
                                                                                {rec.type}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                                {rec.label}
                                                                            </span>
                                                                        </div>
                                                                        <VerifyBadge ok={rec.verified} />
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Host / Name</p>
                                                                            <div className="flex items-center gap-1.5 mt-1 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-150 dark:border-slate-800">
                                                                                <code className="font-mono flex-1 text-slate-800 dark:text-slate-200 break-all select-all">{rec.host}</code>
                                                                                <button
                                                                                    onClick={() => copyText(rec.host, `${copyId}-host`)}
                                                                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                >
                                                                                    {copiedField === `${copyId}-host` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value / Destination</p>
                                                                            <div className="flex items-center gap-1.5 mt-1 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-150 dark:border-slate-800">
                                                                                <code className="font-mono flex-1 text-slate-800 dark:text-slate-200 break-all select-all">{rec.value}</code>
                                                                                <button
                                                                                    onClick={() => copyText(rec.value, `${copyId}-val`)}
                                                                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                >
                                                                                    {copiedField === `${copyId}-val` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Cloudflare Quick Import */}
                                                {!isVerified && (
                                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
                                                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                                            <Zap className="w-4 h-4 fill-current" />
                                                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                                                Cloudflare Instant DNS Provisioning
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            Configure DNS records automatically by entering your Cloudflare API Token (must have Zone.DNS:Edit permissions).
                                                        </p>
                                                        
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                                            <div className="space-y-1">
                                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Cloudflare API Token
                                                                </label>
                                                                <Input
                                                                    type="password"
                                                                    placeholder="e.g. c254d3e-..."
                                                                    value={cfToken}
                                                                    onChange={(e) => setCfToken(e.target.value)}
                                                                    className="bg-white dark:bg-slate-950 h-9"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Cloudflare Zone ID (Optional)
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        placeholder="Lookup automatically if empty"
                                                                        value={cfZoneId}
                                                                        onChange={(e) => setCfZoneId(e.target.value)}
                                                                        className="bg-white dark:bg-slate-950 h-9"
                                                                    />
                                                                    <Button
                                                                        onClick={() => handleCloudflareProvision(dom.id)}
                                                                        disabled={!cfToken || cfLoading}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs"
                                                                        isLoading={cfLoading}
                                                                    >
                                                                        Provision Records
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Simple local Plus SVG icon component
function PlusIcon(props) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
}
