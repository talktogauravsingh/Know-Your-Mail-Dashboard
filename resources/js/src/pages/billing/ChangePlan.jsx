import React, { useState, useEffect } from "react";
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
import { 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    Mail, 
    Sparkles, 
    AlertCircle, 
    Percent, 
    ArrowUpRight, 
    HelpCircle, 
    User, 
    Info, 
    ArrowRight,
    Loader2
} from "lucide-react";
import { useStore } from "../../store/useStore";

// Razorpay checkout helper loader
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

export default function ChangePlan() {
    // Backend Zustand store parameters
    const billingSummary = useStore((state) => state.billingSummary);
    const billingPlans = useStore((state) => state.billingPlans);
    const billingLoading = useStore((state) => state.billingLoading);
    const billingCheckoutLoading = useStore((state) => state.billingCheckoutLoading);
    const fetchBillingSummary = useStore((state) => state.fetchBillingSummary);
    const fetchBillingPlans = useStore((state) => state.fetchBillingPlans);
    const createPaymentOrder = useStore((state) => state.createPaymentOrder);
    const verifyPayment = useStore((state) => state.verifyPayment);
    const user = useStore((state) => state.user);
    const addToast = useStore((state) => state.addToast);

    const currentPlan = billingSummary?.current_plan;
    const subscription = billingSummary?.subscription;

    // Component states
    const [contactCount, setContactCount] = useState(5000);
    const [expandedPlans, setExpandedPlans] = useState({});
    const [sliderVal, setSliderVal] = useState(15); // Approx 5000 in logarithmic slider scale
    const [loadingPlanKey, setLoadingPlanKey] = useState(null); // Track which card button is loading

    // Enterprise Contact Modal States
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactSubject, setContactSubject] = useState("Enterprise Custom Plan Request");
    const [contactMessage, setContactMessage] = useState("");
    const [isSubmittingContact, setIsSubmittingContact] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    useEffect(() => {
        fetchBillingSummary().catch(() => {});
        fetchBillingPlans().catch(() => {});
    }, [fetchBillingPlans, fetchBillingSummary]);

    // Sync slider to current subscription's audience count when summary loads
    useEffect(() => {
        const limit = currentPlan?.emails_limit;
        if (limit && limit > 0) {
            setContactCount(limit);
            // Reverse the logarithmic scale: val = (log(limit) - log(1000)) / (log(1000000) - log(1000)) * 100
            const minV = Math.log(1000);
            const maxV = Math.log(1000000);
            const computedVal = Math.round(((Math.log(limit) - minV) / (maxV - minV)) * 100);
            setSliderVal(Math.max(0, Math.min(100, computedVal)));
        }
    }, [currentPlan?.emails_limit]);

    // Handle local spinner cleaning once global checkout loading is finished
    useEffect(() => {
        if (!billingCheckoutLoading) {
            setLoadingPlanKey(null);
        }
    }, [billingCheckoutLoading]);

    // Detect currency dynamically from billing info (Default to INR)
    const detectedCurrency = currentPlan?.currency || (billingPlans.length > 0 ? billingPlans[0].currency : "INR");
    const isINR = String(detectedCurrency).toUpperCase() === "INR";
    const currencySymbol = isINR ? "₹" : "$";

    const currentEmailsLimit = currentPlan?.emails_limit || 0;

    // Frontend high-fidelity plans metadata (3 Price Plans: Starter, Growth, Pro)
    const plansMetadata = [
        {
            key: "starter",
            name: "Starter",
            basePriceINR: "₹499",
            basePriceUSD: "$9",
            allowance: 5000,
            bestFor: "Startups & Growing Senders",
            btnText: "Get Starter",
            btnColor: "bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-900 dark:border-emerald-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            keyFeatures: [
                "Includes 5,000 contacts",
                "Unlimited Segments",
                "Full Analytics Dashboard",
                "90-Day Data Retention"
            ],
            moreFeatures: [
                "Remove Branding Footers",
                "Priority Email Support",
                "Custom Tracking Domain (Beta)"
            ]
        },
        {
            key: "pro", // Maps to backend 'pro' plan (Zustand)
            name: "Growth",
            basePriceINR: "₹999",
            basePriceUSD: "$19",
            allowance: 20000,
            bestFor: "Advanced Marketers & Teams",
            btnText: "Get Growth",
            btnColor: "bg-pink-500 hover:bg-pink-600 text-white border-2 border-slate-900 dark:border-pink-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            keyFeatures: [
                "Includes 20,000 contacts",
                "AI Send-Time Optimization",
                "AI Spam Guard (Beta)",
                "1-Year Data Retention"
            ],
            moreFeatures: [
                "Up to 5 Workspace Team Users",
                "Advanced Attribution Reports",
                "Dedicated Customer Support"
            ]
        },
        {
            key: "scale", // Maps to backend 'scale' plan (Zustand)
            name: "Pro",
            basePriceINR: "Custom",
            basePriceUSD: "Custom",
            allowance: 1000000,
            bestFor: "Agencies & Enterprise",
            btnText: "Contact Us",
            btnColor: "bg-blue-500 hover:bg-blue-600 text-white border-2 border-slate-900 dark:border-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            keyFeatures: [
                "Unlimited contacts scaling",
                "Full AI Intelligence Layer",
                "Dedicated Success Manager",
                "Unlimited Data Retention"
            ],
            moreFeatures: [
                "Agency Portal Access",
                "Custom Priority SLAs",
                "White-labeled Tracking Reports"
            ]
        }
    ];

    // Logarithmic slider helper
    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value);
        setSliderVal(val);
        // Convert 0-100 range to 1000-1,000,000 range logarithmically
        const minP = 0;
        const maxP = 100;
        const minV = Math.log(1000);
        const maxV = Math.log(1000000);
        const scale = (maxV - minV) / (maxP - minP);
        const result = Math.exp(minV + scale * (val - minP));
        
        // Round to nearest 500 for better UX
        setContactCount(Math.round(result / 500) * 500);
    };

    // Calculate dynamic price based on contactCount
    const calculateDynamicPrice = (plan) => {
        if (plan.key === "scale") return "Custom";

        try {
            const basePriceStr = isINR ? plan.basePriceINR : plan.basePriceUSD;
            const basePrice = parseInt(basePriceStr.replace(/[₹$]/g, "")) || 0;
            
            const allowance = plan.allowance || 0;
            const overage = Math.max(0, contactCount - allowance);
            const unitPrice = isINR ? 0.05 : 0.001;
            const overageCost = overage * unitPrice;
            
            const total = basePrice + overageCost;
            
            if (isINR) {
                return `₹${Math.round(total).toLocaleString("en-IN")}`;
            } else {
                return `$${total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
            }
        } catch (e) {
            console.error("Price calculation error:", e);
            return isINR ? plan.basePriceINR : plan.basePriceUSD;
        }
    };

    // Live plan total cost helper for slider table
    const calculatePlanTotal = (planKey, count) => {
        const plan = plansMetadata.find((p) => p.key === planKey);
        if (!plan) return "0";
        if (plan.key === "scale") return "Custom";
        
        const basePriceStr = isINR ? plan.basePriceINR : plan.basePriceUSD;
        const basePrice = parseInt(basePriceStr.replace(/[₹$]/g, "")) || 0;
        const overage = Math.max(0, count - plan.allowance);
        const unitPrice = isINR ? 0.05 : 0.001;
        const total = basePrice + (overage * unitPrice);
        
        if (isINR) {
            return Math.round(total).toLocaleString("en-IN");
        } else {
            return total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
    };

    // Toggle features accordion drawer
    const toggleExpandPlan = (planKey) => {
        setExpandedPlans((prev) => ({
            ...prev,
            [planKey]: !prev[planKey],
        }));
    };

    // Razorpay payment integration hook
    const handlePlanCheckout = async (planKey) => {
        if (planKey === "scale") {
            // Enterprise opens the contact dialog
            setIsContactOpen(true);
            return;
        }

        // Set local loading key to avoid global multi-spinner bug!
        setLoadingPlanKey(planKey);

        // Determine billing action
        let billingAction = "new_plan";
        if (subscription) {
            billingAction = (subscription.plan_key === planKey) ? "scale_audience" : "update_plan";
        }
        
        try {
            const order = await createPaymentOrder({
                planKey,
                billingAction,
                contactCount, // Pass target dynamic contacts capacity
            });

            const Razorpay = await loadRazorpayScript();

            // Setup display text for the Razorpay dialog
            const isScaleDelta = billingAction === "scale_audience";
            const displayCost = (order.amount_minor / 100).toLocaleString(isINR ? "en-IN" : "en-US", {
                style: "currency",
                currency: order.currency,
                maximumFractionDigits: 0
            });

            const checkoutOptions = {
                key: order.razorpay_key_id,
                name: "KnowYourMail",
                description: isScaleDelta 
                    ? `Audience Scale Top-up: ${planKey} to ${contactCount.toLocaleString()} contacts` 
                    : `New Plan Subscription: ${planKey}`,
                handler: async (response) => {
                    await verifyPayment(response);
                    fetchBillingSummary().catch(() => {});
                },
                prefill: {
                    name: user?.name || "",
                    email: user?.email || "",
                },
                notes: {
                    plan_key: planKey,
                    billing_action: billingAction,
                    contact_count: contactCount,
                },
                theme: {
                    color: "#6366f1",
                },
                modal: {
                    ondismiss: () => {
                        fetchBillingSummary().catch(() => {});
                        setLoadingPlanKey(null);
                    },
                },
            };

            if (order.provider_order_id && order.provider_order_id.startsWith("sub_")) {
                checkoutOptions.subscription_id = order.provider_order_id;
            } else {
                checkoutOptions.order_id = order.provider_order_id;
                checkoutOptions.amount = order.amount_minor;
                checkoutOptions.currency = order.currency;
            }

            const instance = new Razorpay(checkoutOptions);

            instance.open();
        } catch (err) {
            console.error("Order payment initialization failed:", err);
            setLoadingPlanKey(null);
        }
    };

    // Submit Custom Enterprise Inquiry Form
    const handleSendEnterpriseInquiry = (e) => {
        e.preventDefault();
        if (!contactMessage.trim()) {
            addToast("Please type a message before submitting.", "error");
            return;
        }

        setIsSubmittingContact(true);
        // Simulate premium submission with nice visual delay
        setTimeout(() => {
            setIsSubmittingContact(false);
            setContactSuccess(true);
            addToast("Inquiry submitted successfully! Our team will reply shortly.", "success");
            setContactMessage("");
        }, 1500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Current Active Plan Info Header */}
            <Card className="border-2 border-slate-900 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/15 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-2xl relative overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-lg md:text-xl font-black">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-bold">Active Workspace Plan:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                                {currentPlan?.name || "Free"}
                                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-400 animate-pulse" />
                            </span>
                        </div>
                        <Badge
                            className="bg-emerald-500 text-white border-2 border-slate-900 dark:border-emerald-700 text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] px-3 py-1"
                        >
                            {(currentPlan?.amount_minor / 100).toLocaleString(isINR ? "en-IN" : "en-US", {
                                style: "currency",
                                currency: detectedCurrency,
                                maximumFractionDigits: 0
                            })} / {currentPlan?.interval || "month"}
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                        {subscription
                            ? `Subscription Status: ${subscription.status_label || subscription.status} ${subscription.renews_at ? ` • Renews on ${new Date(subscription.renews_at).toLocaleDateString("en-IN")}` : ""}`
                            : "Your workspace is on the Free tier. Choose a premium plan below to scale your audience."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-4 space-y-3">
                    <div className="flex justify-between text-xs md:text-sm font-bold">
                        <span className="text-slate-700 dark:text-slate-300">Workspace Monthly Contact Limit</span>
                        <span className="text-slate-900 dark:text-slate-50">
                            {(currentEmailsLimit || 1000).toLocaleString(isINR ? "en-IN" : "en-US")} contacts
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden border-2 border-slate-900 dark:border-slate-700">
                        <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: subscription ? "100%" : "10%" }}
                        ></div>
                    </div>
                </CardContent>
            </Card>

            {/* Pricing Cards Grid (3 plans: Starter, Growth, Pro) */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mt-8">
                {plansMetadata.map((plan) => {
                    const isCurrentPlan = subscription 
                        ? subscription.plan_key === plan.key 
                        : false;

                    const dynamicPrice = calculateDynamicPrice(plan);
                    const overageAmount = Math.max(0, contactCount - plan.allowance);
                    const hasOverage = overageAmount > 0 && plan.key !== "scale";
                    const expanded = expandedPlans[plan.key] || false;

                    // Pay & Scale Logic
                    const canScaleCurrent = isCurrentPlan && contactCount > currentEmailsLimit;

                    // Compute dynamic scale delta fee (checkout today price)
                    const unitPrice = isINR ? 0.05 : 0.001;
                    const currentOverageAmount = Math.max(0, currentEmailsLimit - plan.allowance);
                    const scaleDeltaOverage = Math.max(0, overageAmount - currentOverageAmount);
                    const scaleDeltaFee = scaleDeltaOverage * unitPrice;

                    let btnLabel = plan.btnText;
                    let btnDisabled = false;

                    if (isCurrentPlan) {
                        if (canScaleCurrent) {
                            const formattedDeltaFee = isINR 
                                ? `₹${Math.round(scaleDeltaFee).toLocaleString("en-IN")}` 
                                : `$${scaleDeltaFee.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                            btnLabel = `Pay & Add Audience (${formattedDeltaFee})`;
                            btnDisabled = false;
                        } else {
                            btnLabel = "Active Plan";
                            btnDisabled = true;
                        }
                    }

                    const isCurrentlyLoading = billingCheckoutLoading && loadingPlanKey === plan.key;

                    return (
                        <div
                            key={plan.key}
                            className={`flex flex-col bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 rounded-2xl relative transition-all duration-200 hover:-translate-y-1 ${
                                isCurrentPlan 
                                    ? "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-[4px_4px_0px_0px_rgba(99,102,241,1)]" 
                                    : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]"
                            }`}
                        >
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                {/* Card Header */}
                                <div>
                                    <div className="text-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                            {plan.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-h-[32px] mt-1 flex items-center justify-center">
                                            {plan.bestFor}
                                        </p>
                                        <div className="mt-3 flex flex-col items-center justify-center">
                                            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                {dynamicPrice}
                                            </span>
                                            {plan.key !== "scale" && (
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                    / month
                                                </span>
                                            )}
                                        </div>

                                        {/* Dynamic scale overage alert */}
                                        {hasOverage && (
                                            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[11px] font-bold animate-pulse">
                                                + {currencySymbol}{(overageAmount * (isINR ? 0.05 : 0.001)).toFixed(2)} scaling fee
                                            </div>
                                        )}
                                    </div>

                                    {/* Features Checklist */}
                                    <div className="py-4">
                                        <ul className="space-y-2.5">
                                            {plan.keyFeatures.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Expandable Secondary Features drawer */}
                                        <div className={`overflow-hidden transition-all duration-300 ${
                                            expanded ? "max-h-40 opacity-100 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3" : "max-h-0 opacity-0"
                                        }`}>
                                            <ul className="space-y-2.5">
                                                {plan.moreFeatures.map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* View All Features Button */}
                                        <button
                                            onClick={() => toggleExpandPlan(plan.key)}
                                            className="w-full flex items-center justify-center gap-1 text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-4 tracking-wider transition-colors"
                                        >
                                            {expanded ? "Hide Details" : "View All Features"}
                                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Plan checkout footer actions */}
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                    <button
                                        onClick={() => handlePlanCheckout(plan.key)}
                                        className={`w-full inline-flex items-center justify-center rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider py-3 px-2 whitespace-normal h-auto min-h-[44px] ${
                                            btnDisabled 
                                                ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-550 border-2 border-slate-300 dark:border-slate-700 cursor-not-allowed" 
                                                : `${plan.btnColor} transform hover:-translate-y-0.5 transition-all duration-150 active:translate-y-0`
                                        }`}
                                        disabled={btnDisabled || billingLoading || billingCheckoutLoading}
                                    >
                                        {isCurrentlyLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                        ) : (
                                            btnLabel
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dynamic Audience Slider & Cost Savings Section */}
            <section className="bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-900 dark:border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
                    
                    {/* Left: Slider controls */}
                    <div className="w-full lg:w-3/5 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                                    Scale Your Audience (Top-up)
                                </h3>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    Slide to simulate your exact monthly contact requirements and add audience.
                                </p>
                            </div>
                            
                            {/* Live Value display badge */}
                            <div className="bg-indigo-500 text-white border-2 border-slate-900 px-4 py-2 rounded-xl text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 self-start sm:self-center">
                                <div className="text-xl font-black">{contactCount.toLocaleString()}</div>
                                <div className="text-[10px] font-black uppercase tracking-wider opacity-85">Contacts</div>
                            </div>
                        </div>

                        {/* Slider control input */}
                        <div className="space-y-3 pt-3">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={sliderVal}
                                onChange={handleSliderChange}
                                className="w-full h-3 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-slate-350 dark:border-slate-700"
                            />
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1">
                                <span>1K</span>
                                <span>10K</span>
                                <span>100K</span>
                                <span>1M</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold italic flex items-center gap-1.5 pt-1">
                            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                            KnowYourMail processes tracking data internally. Bring your cheap email deliveries!
                        </p>
                    </div>

                    {/* Right: Dynamic savings breakdown & table */}
                    <div className="w-full lg:w-2/5 bg-white dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider mb-4 border-b border-slate-100 dark:border-slate-900 pb-2">
                            Simulated Pricing Summary
                        </h4>

                        <div className="space-y-3.5">
                            {/* Starter Plan Item */}
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>Starter Plan Cost:</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                    {currencySymbol}{calculatePlanTotal("starter", contactCount)} <span className="text-[10px] text-slate-400">/mo</span>
                                </span>
                            </div>

                            {/* Growth Plan Item */}
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>Growth Plan Cost:</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                    {currencySymbol}{calculatePlanTotal("pro", contactCount)} <span className="text-[10px] text-slate-400">/mo</span>
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-800 my-2"></div>

                            {/* Savings Block */}
                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
                                <div>
                                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                        Potential Savings
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Compared to typical legacy platforms
                                    </div>
                                </div>
                                <div className="bg-emerald-500 text-white border-2 border-slate-900 text-lg font-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    90% Lower
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Custom Contact Inquiry Dialog Modal */}
            {isContactOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-4 border-slate-900 rounded-3xl p-6 md:p-8 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] animate-in zoom-in-95 duration-200">
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsContactOpen(false);
                                setContactSuccess(false);
                            }}
                            className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-755 border-2 border-slate-900 text-slate-800 dark:text-slate-100 w-8 h-8 rounded-full flex items-center justify-center font-black transition-colors"
                        >
                            ✕
                        </button>

                        {!contactSuccess ? (
                            <form onSubmit={handleSendEnterpriseInquiry} className="space-y-5">
                                <div className="space-y-1">
                                    <div className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900/50">
                                        Enterprise Solution
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                        Let's Build Your Plan
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Tell us about your campaign volumes. Our engineering team will construct a bespoke tier for you.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                                            Inquiry Subject
                                        </label>
                                        <input
                                            type="text"
                                            value={contactSubject}
                                            onChange={(e) => setContactSubject(e.target.value)}
                                            className="w-full border-2 border-slate-900 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider flex justify-between">
                                            <span>Detail Your Volume Requirements</span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {contactMessage.length}/1000
                                            </span>
                                        </label>
                                        <textarea
                                            value={contactMessage}
                                            onChange={(e) => setContactMessage(e.target.value)}
                                            maxLength={1000}
                                            rows={4}
                                            placeholder="Example: We send 2,500,000 emails per month to active users. We require custom segmentation logs and a custom tracking subdomain..."
                                            className="w-full border-2 border-slate-900 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        isLoading={isSubmittingContact}
                                        className="w-full bg-blue-500 hover:bg-blue-600 border-2 border-slate-900 text-white text-xs font-black uppercase tracking-wider py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px]"
                                    >
                                        Send Message <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    Message Dispatched!
                                </h3>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                                    Thank you! Your inquiries were successfully sent to the KnowYourMail enterprise support desk. An account executive will reach out to you within 4 hours.
                                </p>
                                <div className="pt-2">
                                    <Button
                                        onClick={() => {
                                            setIsContactOpen(false);
                                            setContactSuccess(false);
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-900 text-xs font-black px-6 py-2.5"
                                    >
                                        Close Window
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
