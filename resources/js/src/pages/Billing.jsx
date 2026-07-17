import React, { useState } from "react";
import { CreditCard, History } from "lucide-react";
import ChangePlan from "./billing/ChangePlan";
import PlanHistory from "./billing/PlanHistory";

export default function Billing() {
    const [activeTab, setActiveTab] = useState("change-plan");

    const tabs = [
        { id: "change-plan", label: "Change Plan", icon: CreditCard },
        { id: "history", label: "Plan History", icon: History },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    Billing & Plan
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your subscription and view your billing history.
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
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? "bg-indigo-50/80 text-indigo-700 border-l-4 border-indigo-600 rounded-r-md dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-400 pl-2 font-bold"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md"
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
                    {activeTab === "change-plan" && <ChangePlan />}
                    {activeTab === "history" && <PlanHistory />}
                </div>
            </div>
        </div>
    );
}
