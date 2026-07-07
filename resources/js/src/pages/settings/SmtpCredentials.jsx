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
    KeyRound,
    Plus,
    Trash2,
    Copy,
    CheckCircle2,
    Eye,
    EyeOff,
    Server,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    Send
} from "lucide-react";
import { useStore } from "../../store/useStore";

export default function SmtpCredentials() {
    const [isAdding, setIsAdding] = useState(false);
    const [username, setUsername] = useState("");
    const [rateLimit, setRateLimit] = useState(10000);
    const [domainId, setDomainId] = useState("");

    const [generatedPassword, setGeneratedPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showTestPassword, setShowTestPassword] = useState(false);
    const [copiedField, setCopiedField] = useState("");

    const credentials = useStore((state) => state.smtpCredentials);
    const credsLoading = useStore((state) => state.smtpCredentialsLoading);
    const fetchSmtpCredentials = useStore((state) => state.fetchSmtpCredentials);
    const addSmtpCredential = useStore((state) => state.addSmtpCredential);
    const updateSmtpCredential = useStore((state) => state.updateSmtpCredential);
    const deleteSmtpCredential = useStore((state) => state.deleteSmtpCredential);

    const domains = useStore((state) => state.domains);
    const fetchDomains = useStore((state) => state.fetchDomains);
    const isLoading = useStore((state) => state.isLoading);

    // Test Email Modal state
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [activeCredForTest, setActiveCredForTest] = useState(null);
    const [testPassword, setTestPassword] = useState("");
    const [testRecipient, setTestRecipient] = useState("");
    const [testSubject, setTestSubject] = useState("");
    const [testBody, setTestBody] = useState("");
    const [testLoading, setTestLoading] = useState(false);

    const testSmtpCredential = useStore((state) => state.testSmtpCredential);

    const handleSendTest = async (e) => {
        e.preventDefault();
        if (!testPassword || !testRecipient) return;
        setTestLoading(true);
        try {
            await testSmtpCredential(activeCredForTest.id, {
                password: testPassword,
                recipient_email: testRecipient,
                subject: testSubject || null,
                body: testBody || null,
            });
            setTestModalOpen(false);
            setTestPassword("");
            setTestRecipient("");
            setTestSubject("");
            setTestBody("");
        } catch (err) {
            // Handled by toast inside store
        } finally {
            setTestLoading(false);
        }
    };

    useEffect(() => {
        fetchSmtpCredentials();
        fetchDomains();
    }, [fetchSmtpCredentials, fetchDomains]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!username) return;
        try {
            const data = await addSmtpCredential({
                username,
                rateLimit,
                domainId: domainId || null,
            });
            setGeneratedPassword(data.rawPassword);
            setUsername("");
            setRateLimit(10000);
            setDomainId("");
            setIsAdding(false);
        } catch (err) {
            // Handled by store
        }
    };

    const handleToggleActive = (cred) => {
        updateSmtpCredential(cred.id, { is_active: !cred.is_active });
    };

    const copyText = (text, fieldId) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(""), 2000);
    };

    // Filter only verified domains for SMTP scoping dropdown
    const verifiedDomains = domains.filter((d) => d.status === "verified");

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Connection Information */}
            <Card className="border-indigo-150 bg-indigo-50/20 dark:border-indigo-900/30 dark:bg-indigo-950/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Haraka Relay Configuration
                    </CardTitle>
                    <CardDescription>
                        Relay outbound emails from external clients using these settings:
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                            { label: "Host / Endpoint", value: "smtp.knowyourmail.com" },
                            { label: "Port", value: "587" },
                            { label: "Encryption", value: "STARTTLS (TLS)" },
                            { label: "Auth Methods", value: "PLAIN / LOGIN" },
                        ].map((item) => (
                            <div key={item.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 select-all">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>SMTP Relay Credentials</CardTitle>
                        <CardDescription>
                            Generate SMTP keys to send outbound emails and track deliveries.
                        </CardDescription>
                    </div>
                    {!isAdding && (
                        <Button
                            onClick={() => {
                                setIsAdding(true);
                                setGeneratedPassword("");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            <Plus className="w-4 h-4" /> Create Key
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Raw Password Display */}
                    {generatedPassword && (
                        <div className="border border-emerald-500/30 bg-emerald-950/15 rounded-xl p-4 space-y-3">
                            <div className="flex gap-2 items-center text-emerald-700 dark:text-emerald-400">
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                <p className="text-xs font-bold">
                                    SMTP Password Generated! Copy it now. It will not be shown again.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 max-w-lg">
                                <code className="flex-1 font-mono text-xs text-amber-600 bg-black/10 dark:bg-black/40 border border-slate-200 dark:border-slate-800 p-2 rounded select-all break-all">
                                    {showPassword ? generatedPassword : "•".repeat(32)}
                                </code>
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => copyText(generatedPassword, "smtp-pw")}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {copiedField === "smtp-pw" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add Form */}
                    {isAdding && (
                        <form
                            onSubmit={handleCreate}
                            className="border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-5 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Username
                                    </label>
                                    <Input
                                        placeholder="e.g. app-sender"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Rate Limit (emails/hour)
                                    </label>
                                    <Input
                                        type="number"
                                        min={100}
                                        value={rateLimit}
                                        onChange={(e) => setRateLimit(parseInt(e.target.value) || 10000)}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Scoped Domain (Optional)
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        value={domainId}
                                        onChange={(e) => setDomainId(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">All Domains</option>
                                        {verifiedDomains.map((dom) => (
                                            <option key={dom.id} value={dom.id}>
                                                {dom.domain}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    isLoading={isLoading}
                                >
                                    Generate Credentials
                                </Button>
                                <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Credentials List */}
                    {credsLoading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-14 w-full bg-slate-100 dark:bg-slate-900/60 rounded-xl" />
                            ))}
                        </div>
                    ) : credentials.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <KeyRound className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                            No SMTP credentials created yet. Click "Create Key" to get started.
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                        <th className="p-4 font-bold text-slate-500">Username</th>
                                        <th className="p-4 font-bold text-slate-500">Domain Scope</th>
                                        <th className="p-4 font-bold text-slate-500 text-right">Rate Limit</th>
                                        <th className="p-4 font-bold text-slate-500">Status</th>
                                        <th className="p-4 font-bold text-slate-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {credentials.map((cred) => (
                                        <tr key={cred.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                            <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                {cred.username}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">
                                                {cred.domain_name || "All Domains"}
                                            </td>
                                            <td className="p-4 text-right text-slate-600 dark:text-slate-300">
                                                {cred.rate_limit_per_hour.toLocaleString()}/hr
                                            </td>
                                            <td className="p-4">
                                                <Badge
                                                    className={`font-semibold border-none rounded-full text-[10px] uppercase py-0.5 px-2.5 flex items-center gap-1 w-fit cursor-pointer ${
                                                        cred.is_active
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                    }`}
                                                    onClick={() => handleToggleActive(cred)}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cred.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    {cred.is_active ? "Active" : "Disabled"}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs font-semibold px-2.5 bg-white dark:bg-slate-950 text-indigo-600 border-indigo-100 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-950 dark:hover:bg-indigo-950/30 gap-1"
                                                    onClick={() => {
                                                        setActiveCredForTest(cred);
                                                        setTestSubject("KnowYourMail ESMTP Test Connection");
                                                        setTestBody("<p>Hello!</p><p>This is a test message to confirm your ESMTP credentials are working properly with the Haraka relay service.</p>");
                                                        setTestModalOpen(true);
                                                    }}
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    Test
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => {
                                                        if (confirm(`Revoke SMTP credentials for "${cred.username}"?`)) {
                                                            deleteSmtpCredential(cred.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Test Email Modal */}
            {testModalOpen && activeCredForTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    Send Test Email
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Verify ESMTP connection for <code className="font-mono text-indigo-600 dark:text-indigo-400">{activeCredForTest.username}</code>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setTestModalOpen(false);
                                    setTestPassword("");
                                    setTestRecipient("");
                                    setTestSubject("");
                                    setTestBody("");
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSendTest} className="p-5 space-y-4 text-xs">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        SMTP Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowTestPassword(!showTestPassword)}
                                        className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                                    >
                                        {showTestPassword ? (
                                            <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                                        ) : (
                                            <><Eye className="h-3.5 w-3.5" /> Show</>
                                        )}
                                    </button>
                                </div>
                                <Input
                                    type={showTestPassword ? "text" : "password"}
                                    required
                                    placeholder="Paste your SMTP key password"
                                    value={testPassword}
                                    onChange={(e) => setTestPassword(e.target.value)}
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Recipient Email
                                </label>
                                <Input
                                    type="email"
                                    required
                                    placeholder="recipient@example.com"
                                    value={testRecipient}
                                    onChange={(e) => setTestRecipient(e.target.value)}
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Subject
                                </label>
                                <Input
                                    placeholder="e.g. My test email"
                                    value={testSubject}
                                    onChange={(e) => setTestSubject(e.target.value)}
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Body Content
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Write message content (HTML is supported)"
                                    value={testBody}
                                    onChange={(e) => setTestBody(e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="pt-2 flex gap-2 justify-end">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setTestModalOpen(false)}
                                    disabled={testLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    isLoading={testLoading}
                                >
                                    Send Message
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
