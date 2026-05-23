import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../components/ui/Card";
import { useStore } from "../../store/useStore";
import { Badge } from "../../components/ui/Badge";
import { CreditCard, ArrowUpRight, TrendingUp, Calendar, Loader2 } from "lucide-react";

export default function PlanHistory() {
    const billingHistory = useStore((state) => state.billingHistory);
    const billingLoading = useStore((state) => state.billingLoading);
    const fetchBillingHistory = useStore((state) => state.fetchBillingHistory);

    useEffect(() => {
        fetchBillingHistory();
    }, [fetchBillingHistory]);

    const formatMoney = (amountMinor, currency) => {
        const amount = (amountMinor || 0) / 100;
        const isINR = String(currency).toUpperCase() === "INR";
        return new Intl.NumberFormat(isINR ? "en-IN" : "en-US", {
            style: "currency",
            currency: isINR ? "INR" : String(currency).toUpperCase(),
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-2 border-slate-900 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-2xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white">Plan History</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-semibold text-xs md:text-sm">
                        View your secure receipt records of plan subscriptions, upgrades, and dynamic audience scaling top-ups.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {billingLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">
                                Retrieving Ledger...
                            </p>
                        </div>
                    ) : billingHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-3">
                                <CreditCard className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                                No billing records available yet.
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs mt-1">
                                Complete a tier checkout or scale your audience to create a ledger entry.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {billingHistory.map((tx) => {
                                const isScale = tx.billing_action === "scale_audience";
                                const planLabel = tx.plan_key === "pro" ? "Growth" : (tx.plan_key === "scale" ? "Pro" : "Starter");

                                return (
                                    <div
                                        key={tx.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-800 rounded-xl relative overflow-hidden transition-all duration-150 hover:bg-slate-100/50 dark:hover:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Left icon badge */}
                                            <div className={`w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                                                isScale 
                                                    ? "bg-amber-400 text-slate-900" 
                                                    : "bg-indigo-500 text-white"
                                            }`}>
                                                {isScale ? <TrendingUp className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                            </div>

                                            {/* Middle transaction data */}
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">
                                                        {isScale ? "Audience Scaled (Top-up)" : `${planLabel} Plan Subscription`}
                                                    </span>
                                                    <Badge
                                                        className={`text-[9px] font-black border-2 border-slate-900 uppercase tracking-wider px-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                                                            isScale 
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
                                                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                        }`}
                                                    >
                                                        {isScale ? "Audience Add-on" : "Plan Active"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(tx.created_at)}
                                                </p>
                                                {tx.contact_count && (
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-350 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 inline-block px-2 py-0.5 rounded-md mt-1">
                                                        👉 Total Audience Limit: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{tx.contact_count.toLocaleString()} contacts</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right cost display */}
                                        <div className="mt-4 md:mt-0 flex flex-row md:flex-col items-baseline md:items-end justify-between md:justify-center border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-3 md:pt-0">
                                            <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
                                                {formatMoney(tx.amount_minor, tx.currency)}
                                                <span className="text-[10px] text-slate-400 font-bold">Paid</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                                ID: <span className="font-black text-slate-600 dark:text-slate-300">{tx.provider_payment_id || tx.provider_order_id}</span>
                                            </div>
                                        </div>
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
