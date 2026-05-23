import React, { useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Server, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";

export default function EmailIntegrations() {
    const [isAddingSmtp, setIsAddingSmtp] = useState(false);
    const [newSmtp, setNewSmtp] = useState({
        provider: "Custom SMTP",
        host: "",
        port: 587,
        encryption: "tls",
        username: "",
        password: "",
        fromName: "",
        fromAddress: "",
    });

    const smtpConfigurations = useStore((state) => state.smtpConfigurations);
    const deleteSmtpConfiguration = useStore((state) => state.deleteSmtpConfiguration);
    const addSmtpConfiguration = useStore((state) => state.addSmtpConfiguration);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Managed Configurations
                    </CardTitle>
                    <CardDescription>
                        Domain configurations provided by us. You can use these immediately without setup.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                EmailTracker Shared IPs
                            </p>
                            <p className="text-xs text-slate-500">
                                High deliverability routing via emailtracker.io
                            </p>
                        </div>
                        <Badge
                            variant="success"
                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none"
                        >
                            Active
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Custom SMTP Credentials</CardTitle>
                        <CardDescription>
                            Connect third-party providers like SendGrid, AWS SES, or Gmail.
                        </CardDescription>
                    </div>
                    {!isAddingSmtp && (
                        <Button
                            onClick={() => setIsAddingSmtp(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Setup
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isAddingSmtp ? (
                        <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Provider
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        value={newSmtp.provider}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, provider: e.target.value })}
                                    >
                                        <option value="Custom SMTP">Custom SMTP</option>
                                        <option value="AWS SES">AWS SES</option>
                                        <option value="SendGrid">SendGrid</option>
                                        <option value="Gmail">Gmail</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Host / Endpoint URLs
                                    </label>
                                    <Input
                                        value={newSmtp.host}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, host: e.target.value })}
                                        placeholder="smtp.example.com"
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Port
                                    </label>
                                    <Input
                                        type="number"
                                        value={newSmtp.port}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, port: parseInt(e.target.value) })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Encryption
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        value={newSmtp.encryption}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, encryption: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        <option value="tls">TLS</option>
                                        <option value="ssl">SSL</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Username / API Key
                                    </label>
                                    <Input
                                        value={newSmtp.username}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, username: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Password / Secret
                                    </label>
                                    <Input
                                        type="password"
                                        value={newSmtp.password}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, password: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Sender Name
                                    </label>
                                    <Input
                                        value={newSmtp.fromName}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, fromName: e.target.value })}
                                        placeholder="Marketing Team"
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Sender Address
                                    </label>
                                    <Input
                                        value={newSmtp.fromAddress}
                                        onChange={(e) => setNewSmtp({ ...newSmtp, fromAddress: e.target.value })}
                                        placeholder="hello@example.com"
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddingSmtp(false)}
                                    className="bg-white dark:bg-slate-950"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (newSmtp.host && newSmtp.username && newSmtp.password) {
                                            addSmtpConfiguration(newSmtp);
                                            setIsAddingSmtp(false);
                                            setNewSmtp({
                                                provider: "Custom SMTP",
                                                host: "",
                                                port: 587,
                                                encryption: "tls",
                                                username: "",
                                                password: "",
                                                fromName: "",
                                                fromAddress: "",
                                            });
                                        }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    Save Configuration
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                            {smtpConfigurations.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    No custom SMTP configurations added yet.
                                </div>
                            ) : (
                                smtpConfigurations.map((config, index) => (
                                    <div
                                        key={config.id}
                                        className={`flex items-center justify-between p-4 bg-white dark:bg-slate-950 ${index !== smtpConfigurations.length - 1 ? "border-b border-slate-200 dark:border-slate-800" : ""}`}
                                    >
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                                {config.provider}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {config.fromAddress} ({config.host})
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => deleteSmtpConfiguration(config.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
