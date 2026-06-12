import React, { useState, useEffect, useCallback } from "react";
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
    Ban,
    Plus,
    Trash2,
    Search,
    AlertTriangle,
    Mail,
    ChevronLeft,
    ChevronRight,
    ShieldX,
} from "lucide-react";
import { useStore } from "../../store/useStore";

const REASON_STYLES = {
    bounce: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-none",
    complaint: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-none",
    manual: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-none",
};

export default function Suppressions() {
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newReason, setNewReason] = useState("manual");

    const suppressions = useStore((state) => state.suppressions);
    const total = useStore((state) => state.suppressionsTotal);
    const loading = useStore((state) => state.suppressionsLoading);
    const fetchSuppressions = useStore((state) => state.fetchSuppressions);
    const addSuppression = useStore((state) => state.addSuppression);
    const deleteSuppression = useStore((state) => state.deleteSuppression);
    const isLoading = useStore((state) => state.isLoading);

    const LIMIT = 15;

    const loadData = useCallback(() => {
        fetchSuppressions({
            page,
            limit: LIMIT,
            search: searchQuery.trim() || undefined,
        });
    }, [fetchSuppressions, page, searchQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle search query changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newEmail) return;
        try {
            await addSuppression({ email: newEmail, reason: newReason });
            setIsAdding(false);
            setNewEmail("");
            setNewReason("manual");
            loadData();
        } catch (err) {
            // Handled by store
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Remove this email from the suppression list? It will be eligible to receive emails again.")) {
            await deleteSuppression(id);
            loadData();
        }
    };

    const totalPages = Math.ceil(total / LIMIT) || 1;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Warning banner */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                    <h4 className="font-bold text-amber-700 dark:text-amber-400">Automatic Suppression Protection</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Emails that result in hard bounces or spam complaints are automatically suppressed to safeguard your sender reputation.
                        Removing automatic suppressions should be done with caution.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Suppression List</CardTitle>
                        <CardDescription>
                            Review and manage blocked, bounced, or manually blacklisted email addresses.
                        </CardDescription>
                    </div>
                    {!isAdding && (
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Email
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add Form */}
                    {isAdding && (
                        <form
                            onSubmit={handleAdd}
                            className="border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-5 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        <Input
                                            type="email"
                                            placeholder="user@domain.com"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="pl-9 bg-white dark:bg-slate-950"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Reason
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        value={newReason}
                                        onChange={(e) => setNewReason(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="manual">Manual Block</option>
                                        <option value="bounce">Bounce</option>
                                        <option value="complaint">Complaint</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    isLoading={isLoading}
                                >
                                    Suppress Email
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

                    {/* Search & Stats Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <Input
                                placeholder="Search by email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white dark:bg-slate-950"
                            />
                        </div>
                        <p className="text-xs text-slate-500 font-semibold shrink-0">
                            {total} suppressed email{total !== 1 ? "s" : ""}
                        </p>
                    </div>

                    {/* Suppressions List */}
                    {loading ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-12 w-full bg-slate-100 dark:bg-slate-900/60 rounded-xl" />
                            ))}
                        </div>
                    ) : suppressions.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <ShieldX className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                            No suppressed emails found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                            <th className="p-4 font-bold text-slate-500">Email Address</th>
                                            <th className="p-4 font-bold text-slate-500">Reason</th>
                                            <th className="p-4 font-bold text-slate-500">Suppressed Since</th>
                                            <th className="p-4 font-bold text-slate-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {suppressions.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-200 select-all">
                                                    {item.email}
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={`font-semibold rounded-full text-[10px] uppercase py-0.5 px-2.5 w-fit ${REASON_STYLES[item.reason] || REASON_STYLES.manual}`}>
                                                        {item.reason}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {new Date(item.created_at || item.updated_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <p>Page {page} of {totalPages}</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="bg-white dark:bg-slate-950 h-8"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page === totalPages}
                                            className="bg-white dark:bg-slate-950 h-8"
                                        >
                                            Next <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
