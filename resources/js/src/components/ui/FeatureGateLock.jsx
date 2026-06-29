import React from "react";
import { Lock, Sparkles, AlertCircle } from "lucide-react";
import { useStore } from "../../store/useStore";

export default function FeatureGateLock({ feature, children, showRemaining = false }) {
    const billingSummary = useStore((state) => state.billingSummary);
    const billingLoading = useStore((state) => state.billingLoading);

    // If loading billing details, show standard loading skeleton or bypass
    if (billingLoading && !billingSummary) {
        return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl h-48 w-full"></div>;
    }

    const activeFeatures = billingSummary?.active_features || [];
    const featureData = activeFeatures.find((f) => f.key === feature);
    
    const hasAccess = !!featureData;
    const isOutOfCredits = hasAccess && featureData.remaining === 0;

    // Access is active and we have credits remaining (or unlimited)
    if (hasAccess && !isOutOfCredits) {
        return (
            <div className="relative">
                {showRemaining && featureData.remaining !== null && (
                    <div className="absolute top-2 right-2 z-10 bg-indigo-500/10 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-black px-2 py-0.5 rounded-full select-none">
                        {featureData.remaining} Credits Left
                    </div>
                )}
                {children}
            </div>
        );
    }

    return (
        <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-slate-350 dark:border-slate-800">
            {/* Blurry glassmorphic placeholder content */}
            <div className="blur-[5px] pointer-events-none select-none opacity-40">
                {children}
            </div>

            {/* Lock UI Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-950 mb-3 animate-bounce">
                    {isOutOfCredits ? <AlertCircle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                
                <h4 className="text-white text-md font-black flex items-center gap-1.5 justify-center">
                    {isOutOfCredits ? "Out of Credits" : "Feature Locked"}
                    <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </h4>
                
                <p className="text-slate-300 text-xs mt-1 mb-4 max-w-[260px] font-semibold">
                    {isOutOfCredits 
                        ? `You have consumed all your monthly credits for this feature.` 
                        : `Upgrade your plan to unlock access to the ${featureData?.name || feature.replace('_', ' ')}.`}
                </p>
                
                <button
                    onClick={() => {
                        // Safe routing redirect to billing page
                        window.location.hash = "#/billing";
                        // Or if router context is needed:
                        window.location.pathname = "/billing";
                    }}
                    className="inline-flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                    Upgrade Plan
                </button>
            </div>
        </div>
    );
}
