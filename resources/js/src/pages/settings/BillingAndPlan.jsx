import React, { useEffect } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    CardFooter,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { CheckCircle2 } from "lucide-react";
import { useStore } from "../../store/useStore";

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

export default function BillingAndPlan() {
    const billingSummary = useStore((state) => state.billingSummary);
    const billingPlans = useStore((state) => state.billingPlans);
    const billingLoading = useStore((state) => state.billingLoading);
    const billingCheckoutLoading = useStore((state) => state.billingCheckoutLoading);
    const fetchBillingSummary = useStore((state) => state.fetchBillingSummary);
    const fetchBillingPlans = useStore((state) => state.fetchBillingPlans);
    const createPaymentOrder = useStore((state) => state.createPaymentOrder);
    const verifyPayment = useStore((state) => state.verifyPayment);
    const user = useStore((state) => state.user);

    const currentPlan = billingSummary?.current_plan;
    const subscription = billingSummary?.subscription;
    const ctaLabel = billingSummary?.cta_label || "Add New Plan";



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

    return (
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
                            {formatMoney(currentPlan?.amount_minor, currentPlan?.currency)}{" "}
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
                                {(currentPlan?.emails_limit || 500).toLocaleString("en-IN")} emails
                            </span>
                        </div>
                        <div className="w-full bg-white dark:bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full"
                                style={{ width: subscription ? "100%" : "12%" }}
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

            <div className="flex justify-start">
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                        window.location.href = "http://localhost:5175/pricing-plan";
                    }}
                >
                    Change Plan
                </Button>
            </div>
        </div>
    );
}
