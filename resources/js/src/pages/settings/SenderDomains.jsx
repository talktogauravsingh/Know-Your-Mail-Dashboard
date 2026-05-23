import React from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Globe, CheckCircle2, AlertCircle } from "lucide-react";

export default function SenderDomains() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Sender Domains</CardTitle>
                        <CardDescription>
                            Authenticate your domains to improve deliverability.
                        </CardDescription>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Globe className="w-4 h-4" /> Add Domain
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                        emailtracker.io
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Authenticated (DKIM, SPF, DMARC)
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm">
                                Manage DNS
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                <div>
                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                        marketing-updates.com
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Pending Verification - 2 records missing
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-slate-950"
                            >
                                Verify Now
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
