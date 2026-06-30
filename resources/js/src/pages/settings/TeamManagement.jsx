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
import { useStore } from "../../store/useStore";
import { Trash2, UserPlus, Shield, Mail, Key, UserCheck, Check, X, Lock } from "lucide-react";

export default function TeamManagement() {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role_id: "",
    });

    const user = useStore((state) => state.user);
    const teamMembers = useStore((state) => state.teamMembers);
    const teamMembersLoading = useStore((state) => state.teamMembersLoading);
    const fetchTeamMembers = useStore((state) => state.fetchTeamMembers);
    const addTeamMember = useStore((state) => state.addTeamMember);
    const deleteTeamMember = useStore((state) => state.deleteTeamMember);
    
    const roles = useStore((state) => state.roles);
    const rolesLoading = useStore((state) => state.rolesLoading);
    const fetchRoles = useStore((state) => state.fetchRoles);

    const passwordResetRequests = useStore((state) => state.passwordResetRequests);
    const passwordResetRequestsLoading = useStore((state) => state.passwordResetRequestsLoading);
    const fetchPasswordResetRequests = useStore((state) => state.fetchPasswordResetRequests);
    const approvePasswordResetRequest = useStore((state) => state.approvePasswordResetRequest);
    const rejectPasswordResetRequest = useStore((state) => state.rejectPasswordResetRequest);
    
    const isLoading = useStore((state) => state.isLoading);

    useEffect(() => {
        fetchTeamMembers();
        fetchRoles();
        fetchPasswordResetRequests();
    }, [fetchTeamMembers, fetchRoles, fetchPasswordResetRequests]);

    // Set default role in form when roles load
    useEffect(() => {
        if (roles.length > 0 && !formData.role_id) {
            // Find a safe default role that is not root
            const defaultRole = roles.find(r => r.slug !== 'root');
            if (defaultRole) {
                setFormData(prev => ({ ...prev, role_id: String(defaultRole.id) }));
            }
        }
    }, [roles, formData.role_id]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password || !formData.role_id) return;
        
        try {
            await addTeamMember(formData);
            setIsAdding(false);
            setFormData({
                name: "",
                email: "",
                password: "",
                role_id: roles.find(r => r.slug !== 'root')?.id || "",
            });
        } catch (err) {
            // Handled by store toasts
        }
    };

    const handleDelete = async (member) => {
        if (confirm(`Are you sure you want to remove ${member.name} from this organization?`)) {
            await deleteTeamMember(member.id);
        }
    };

    const getRoleBadgeClass = (roleSlug) => {
        switch (roleSlug) {
            case 'root':
                return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-none font-bold uppercase text-[10px]";
            case 'super-admin':
                return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-none font-bold uppercase text-[10px]";
            case 'admin':
                return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-none font-semibold text-[10px]";
            case 'manager':
                return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-none font-semibold text-[10px]";
            default:
                return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none text-[10px]";
        }
    };

    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    // Filter assignable roles for dropdown:
    // Root role can only be assigned if the logged-in user is Root.
    const assignableRoles = roles.filter(role => {
        if (role.slug === 'root') {
            return user?.role?.slug === 'root';
        }
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            Manage who has access to this organization workspace.
                        </CardDescription>
                    </div>
                    {!isAdding && (
                        <Button
                            onClick={() => setIsAdding(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            <UserPlus className="w-4 h-4" /> Add User
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isAdding && (
                        <form
                            onSubmit={handleInvite}
                            className="mb-6 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-5 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4 animate-in slide-in-from-top duration-200"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <UserCheck className="w-4 h-4 text-slate-400" /> Name
                                    </label>
                                    <Input
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Mail className="w-4 h-4 text-slate-400" /> Email Address
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="john.doe@company.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Key className="w-4 h-4 text-slate-400" /> Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="bg-white dark:bg-slate-950"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-slate-400" /> Role
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        value={formData.role_id}
                                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                        disabled={isLoading || rolesLoading}
                                        required
                                    >
                                        {assignableRoles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 mt-4">
                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    isLoading={isLoading}
                                >
                                    Save User
                                </Button>
                                <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {teamMembersLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-16 w-full bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <div className="p-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            No team members found.
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                            {teamMembers.map((member) => {
                                const isCurrentUser = user?.id === member.id;
                                const isRootRole = member.role?.slug === 'root';
                                // Logged-in user can delete a member if:
                                // 1. It is not themselves
                                // 2. The member is not root (unless the logged-in user themselves is root)
                                const canDelete = !isCurrentUser && (!isRootRole || user?.role?.slug === 'root');

                                return (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold dark:bg-indigo-900/50 dark:text-indigo-300">
                                                {getInitials(member.name)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                                    {member.name}
                                                    {isCurrentUser && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[9px] py-0 px-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none"
                                                        >
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge className={getRoleBadgeClass(member.role?.slug)}>
                                                {member.role?.name || "No Role"}
                                            </Badge>

                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDelete(member)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Password Reset Requests */}
            <Card className="mt-8 shadow-sm border-slate-200/60 dark:border-slate-800/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-605 text-indigo-600" /> Password Reset Requests
                        </CardTitle>
                        <CardDescription>
                            Approve or reject password reset requests from team members in your organization.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {passwordResetRequestsLoading ? (
                        <div className="space-y-3">
                            <div className="h-16 w-full bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
                        </div>
                    ) : passwordResetRequests.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/55 dark:bg-slate-900/5">
                            No pending password reset requests.
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                            {passwordResetRequests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold dark:bg-amber-950/20 dark:text-amber-300">
                                            {req.user ? getInitials(req.user.name) : 'U'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                                                {req.user ? req.user.name : 'Unknown User'}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {req.user ? req.user.email : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {req.user?.role && (
                                            <Badge className={getRoleBadgeClass(req.user.role.slug)}>
                                                {req.user.role.name}
                                            </Badge>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-1 font-semibold"
                                                onClick={() => approvePasswordResetRequest(req.id)}
                                            >
                                                <Check className="w-4 h-4" /> Approve
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-1 font-semibold"
                                                onClick={() => rejectPasswordResetRequest(req.id)}
                                            >
                                                <X className="w-4 h-4" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
