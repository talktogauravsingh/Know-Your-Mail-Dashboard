import React, { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    CardFooter,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import {
    User,
    Users,
    CreditCard,
    Globe,
    CheckCircle2,
    AlertCircle,
    Mail,
    Plus,
    Trash2,
    Server,
} from "lucide-react";
import { useStore } from "../store/useStore";

function formatMoney(amountMinor = 0, currency = "INR") {
    const safeAmountMinor = Number(amountMinor) || 0;
    const isINR = String(currency).toUpperCase() === "INR";

    // amount_minor is stored in the smallest currency unit (paise/cents), so divide by 100.
    const amount = safeAmountMinor / 100;

    return new Intl.NumberFormat(isINR ? "en-IN" : "en-US", {
        style: "currency",
        currency: isINR ? "INR" : String(currency).toUpperCase(),
        maximumFractionDigits: 0,
    }).format(amount);
}

function loadRazorpayScript() {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Window is not available."));
    }

    if (window.Razorpay) {
        return Promise.resolve(window.Razorpay);
    }

    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
            'script[data-razorpay-checkout="true"]',
        );
        if (existingScript) {
            existingScript.addEventListener(
                "load",
                () => resolve(window.Razorpay),
                { once: true },
            );
            existingScript.addEventListener(
                "error",
                () => reject(new Error("Failed to load Razorpay checkout.")),
                { once: true },
            );
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.dataset.razorpayCheckout = "true";
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () =>
            reject(new Error("Failed to load Razorpay checkout."));
        document.body.appendChild(script);
    });
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState("team");
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
    const deleteSmtpConfiguration = useStore(
        (state) => state.deleteSmtpConfiguration,
    );
    const addSmtpConfiguration = useStore(
        (state) => state.addSmtpConfiguration,
    );
    const billingSummary = useStore((state) => state.billingSummary);
    const billingPlans = useStore((state) => state.billingPlans);
    const billingLoading = useStore((state) => state.billingLoading);
    const billingCheckoutLoading = useStore(
        (state) => state.billingCheckoutLoading,
    );
    const fetchBillingSummary = useStore((state) => state.fetchBillingSummary);
    const fetchBillingPlans = useStore((state) => state.fetchBillingPlans);
    const createPaymentOrder = useStore((state) => state.createPaymentOrder);
    const verifyPayment = useStore((state) => state.verifyPayment);
    const fetchSmtpConfigurations = useStore(
        (state) => state.fetchSmtpConfigurations,
    );
    const user = useStore((state) => state.user);
    const smtpConfigurationsLoading = useStore(
        (state) => state.smtpConfigurationsLoading,
    );
    const activateSmtpConfiguration = useStore(
        (state) => state.activateSmtpConfiguration,
    );

    const currentPlan = billingSummary?.current_plan;
    const subscription = billingSummary?.subscription;
    const ctaLabel = billingSummary?.cta_label || "Add New Plan";

    useEffect(() => {
        fetchBillingSummary().catch(() => {});
        fetchBillingPlans().catch(() => {});
    }, [fetchBillingPlans, fetchBillingSummary]);

    useEffect(() => {
        if (activeTab === 'integrations') {
            fetchSmtpConfigurations().catch(() => {});
        }
    }, [activeTab, fetchSmtpConfigurations]);

    const handlePlanCheckout = async (plan) => {
        const billingAction = subscription ? "update_plan" : "new_plan";
        const order = await createPaymentOrder({
            planKey: plan.key,
            billingAction,
        });

        const Razorpay = await loadRazorpayScript();

        const instance = new Razorpay({
            key: order.razorpay_key_id,
            amount: order.amount_minor,
            currency: order.currency,
            name: "KnowYourMail",
            description: `${billingAction === "update_plan" ? "Plan update" : "New plan"}: ${plan.name}`,
            order_id: order.provider_order_id,
            handler: async (response) => {
                await verifyPayment(response);
            },
            prefill: {
                name: user?.name || "",
                email: user?.email || "",
            },
            notes: {
                plan_key: plan.key,
                billing_action: billingAction,
            },
            theme: {
                color: "#2563eb",
            },
            modal: {
                ondismiss: () => {
                    fetchBillingSummary().catch(() => {});
                },
            },
        });

        instance.open();
    };

    const tabs = [
        { id: "profile", label: "My Profile", icon: User },
        { id: "team", label: "Team Management", icon: Users },
        { id: "integrations", label: "Email Integrations", icon: Mail },
        { id: "domains", label: "Sender Domains", icon: Globe },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    Settings
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your team settings, billing, and sender
                    configurations.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Nav */}
                <div className="w-full md:w-64 shrink-0 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === tab.id
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                }`}
                            >
                                <Icon
                                    className={`w-4 h-4 ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                                />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === "team" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Team Members</CardTitle>
                                        <CardDescription>
                                            Manage who has access to this
                                            workspace.
                                        </CardDescription>
                                    </div>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        Invite User
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold dark:bg-indigo-900/50 dark:text-indigo-300">
                                                    GS
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                                                        Gaurav Singh{" "}
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-1 text-[10px] py-0"
                                                        >
                                                            You
                                                        </Badge>
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        gaurav@emailtracker.io
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none dark:bg-slate-800 dark:text-slate-300">
                                                Admin
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold dark:bg-slate-800 dark:text-slate-400">
                                                    SM
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                                                        Sarah Marketing
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        sarah@emailtracker.io
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none dark:bg-slate-800 dark:text-slate-300">
                                                Editor
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "billing" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                                <CardHeader>
                                    <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <span>
                                            Current Plan:{" "}
                                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                                                {currentPlan?.name || "Free"}
                                            </span>
                                        </span>
                                        <Badge
                                            variant="success"
                                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none"
                                        >
                                            {formatMoney(
                                                currentPlan?.amount_minor,
                                                currentPlan?.currency,
                                            )}{" "}
                                            / {currentPlan?.interval || "month"}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {subscription
                                            ? `Subscription status: ${subscription.status_label || subscription.status}${subscription.renews_at ? ` • Renews on ${new Date(subscription.renews_at).toLocaleDateString("en-IN")}` : ""}`
                                            : "No paid plan is active yet. Choose a plan to start billing through Razorpay."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                Monthly Email Capacity
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-slate-50">
                                                {(
                                                    currentPlan?.emails_limit ||
                                                    500
                                                ).toLocaleString("en-IN")}{" "}
                                                emails
                                            </span>
                                        </div>
                                        <div className="w-full bg-white dark:bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800">
                                            <div
                                                className="bg-indigo-600 h-2.5 rounded-full"
                                                style={{
                                                    width: subscription
                                                        ? "100%"
                                                        : "12%",
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                        {subscription
                                            ? `Your workspace is currently on ${currentPlan?.name || subscription.plan_name}. Selecting another plan will update the subscription after successful payment verification.`
                                            : "You are currently on the free workspace tier. Select a plan below to activate paid billing."}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 lg:grid-cols-3">
                                {billingPlans.map((plan) => {
                                    const isCurrent =
                                        subscription?.plan_key === plan.key;

                                    return (
                                        <Card
                                            key={plan.key}
                                            className={`border ${
                                                isCurrent
                                                    ? "border-indigo-300 shadow-lg shadow-indigo-100/40 dark:border-indigo-500/40 dark:shadow-none"
                                                    : "border-slate-200 dark:border-slate-800"
                                            }`}
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <CardTitle>
                                                            {plan.name}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {plan.description}
                                                        </CardDescription>
                                                    </div>
                                                    {isCurrent && (
                                                        <Badge className="bg-indigo-100 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-300">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>

                                            <CardContent className="space-y-4">
                                                <div>
                                                    <p className="text-3xl font-black text-slate-900 dark:text-slate-50">
                                                        {formatMoney(
                                                            plan.amount_minor,
                                                            plan.currency,
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        per {plan.interval}
                                                    </p>
                                                </div>

                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {(
                                                        plan.emails_limit || 0
                                                    ).toLocaleString(
                                                        "en-IN",
                                                    )}{" "}
                                                    emails included
                                                </div>

                                                <div className="space-y-2">
                                                    {plan.features.map(
                                                        (feature) => (
                                                            <div
                                                                key={feature}
                                                                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                                <span>
                                                                    {feature}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </CardContent>

                                            <CardFooter>
                                                <Button
                                                    className="w-full"
                                                    variant={
                                                        isCurrent
                                                            ? "outline"
                                                            : "default"
                                                    }
                                                    isLoading={
                                                        billingCheckoutLoading
                                                    }
                                                    disabled={billingLoading}
                                                    onClick={() =>
                                                        handlePlanCheckout(
                                                            plan,
                                                        ).catch(() => {})
                                                    }
                                                >
                                                    {isCurrent
                                                        ? "Update Plan"
                                                        : ctaLabel}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === "domains" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Sender Domains</CardTitle>
                                        <CardDescription>
                                            Authenticate your domains to improve
                                            deliverability.
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
                                                        Authenticated (DKIM,
                                                        SPF, DMARC)
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
                                                        Pending Verification - 2
                                                        records missing
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
                    )}

                    {activeTab === "integrations" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        Managed Configurations
                                    </CardTitle>
                                    <CardDescription>
                                        Domain configurations provided by us.
                                        You can use these immediately without
                                        setup.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-slate-50">
                                                EmailTracker Shared IPs
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                High deliverability routing via
                                                emailtracker.io
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
                                        <CardTitle>
                                            Custom SMTP Credentials
                                        </CardTitle>
                                        <CardDescription>
                                            Connect third-party providers like
                                            SendGrid, AWS SES, or Gmail.
                                        </CardDescription>
                                    </div>
                                    {!isAddingSmtp && (
                                        <Button
                                            onClick={() =>
                                                setIsAddingSmtp(true)
                                            }
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add
                                            Setup
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
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                provider:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    >
                                                        <option value="Custom SMTP">
                                                            Custom SMTP
                                                        </option>
                                                        <option value="AWS SES">
                                                            AWS SES
                                                        </option>
                                                        <option value="SendGrid">
                                                            SendGrid
                                                        </option>
                                                        <option value="Gmail">
                                                            Gmail
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                        Host / Endpoint URLs
                                                    </label>
                                                    <Input
                                                        value={newSmtp.host}
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                host: e.target
                                                                    .value,
                                                            })
                                                        }
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
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                port: parseInt(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            })
                                                        }
                                                        className="bg-white dark:bg-slate-950"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                        Encryption
                                                    </label>
                                                    <select
                                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                        value={
                                                            newSmtp.encryption
                                                        }
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                encryption:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    >
                                                        <option value="">
                                                            None
                                                        </option>
                                                        <option value="tls">
                                                            TLS
                                                        </option>
                                                        <option value="ssl">
                                                            SSL
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                        Username / API Key
                                                    </label>
                                                    <Input
                                                        value={newSmtp.username}
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                username:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
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
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                password:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="bg-white dark:bg-slate-950"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                        Sender Name
                                                    </label>
                                                    <Input
                                                        value={newSmtp.fromName}
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                fromName:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="Marketing Team"
                                                        className="bg-white dark:bg-slate-950"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                        Sender Address
                                                    </label>
                                                    <Input
                                                        value={
                                                            newSmtp.fromAddress
                                                        }
                                                        onChange={(e) =>
                                                            setNewSmtp({
                                                                ...newSmtp,
                                                                fromAddress:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="hello@example.com"
                                                        className="bg-white dark:bg-slate-950"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setIsAddingSmtp(false)
                                                    }
                                                    className="bg-white dark:bg-slate-950"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        if (
                                                            newSmtp.host &&
                                                            newSmtp.username
                                                        ) {
                                                            addSmtpConfiguration(
                                                                newSmtp,
                                                            );
                                                            setIsAddingSmtp(
                                                                false,
                                                            );
                                                            setNewSmtp({
                                                                provider:
                                                                    "Custom SMTP",
                                                                host: "",
                                                                port: 587,
                                                                encryption:
                                                                    "tls",
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
                                            {smtpConfigurationsLoading ? (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {[1, 2, 3].map((item) => (
                                                        <div key={item} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 animate-pulse">
                                                            <div className="space-y-2">
                                                                <div className="h-4 w-40 rounded-full bg-slate-200 dark:bg-slate-800" />
                                                                <div className="h-3 w-56 rounded-full bg-slate-100 dark:bg-slate-800/60" />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-7 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                                                                <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : smtpConfigurations.length === 0 ? (
                                                <div className="p-8 text-center text-sm text-slate-500">
                                                    No custom SMTP configurations added yet.
                                                </div>
                                            ) : (
                                                smtpConfigurations.map(
                                                    (config, index) => (
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
                                                                {config.status === 1 ? (
                                                                    <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none font-semibold text-xs py-1 px-2.5 rounded-full flex items-center gap-1.5">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                        Active
                                                                    </Badge>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition-all duration-300 rounded-lg shadow-sm"
                                                                        onClick={() => activateSmtpConfiguration(config.id)}
                                                                    >
                                                                        Activate
                                                                    </Button>
                                                                )}
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
                                                    ),
                                                )
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "profile" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Profile</CardTitle>
                                    <CardDescription>
                                        Update your personal information.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                Full Name
                                            </label>
                                            <Input
                                                defaultValue="Gaurav Singh"
                                                className="dark:bg-slate-950"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                                Email Address
                                            </label>
                                            <Input
                                                defaultValue="gaurav@emailtracker.io"
                                                disabled
                                                className="dark:bg-slate-950"
                                            />
                                        </div>
                                    </div>
                                    <Button className="mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
                                        Save Changes
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
