import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { useStore } from "../../store/useStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import {
    Edit3,
    User,
    Plus,
    Check,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Shield,
    Users,
    Settings,
    Lock,
    Trash2,
} from "lucide-react";

export default function AuthPermissions() {
    const currentUser = useStore((state) => state.user);
    const userRoleSlug = currentUser?.role?.slug;

    // View state: 'roles' (Roles list), 'permissions' (Edit permission matrix), 'user-roles' (Assign roles to user), 'global-config' (Root config)
    const [view, setView] = useState("roles");

    // Core datasets
    const [roles, setRoles] = useState([]);
    const [pages, setPages] = useState([]);
    const [actions, setActions] = useState([]);
    const [orgUsers, setOrgUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Selected objects
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    // Search filters (Roles)
    const [searchRoleName, setSearchRoleName] = useState("");
    const [searchUserId, setSearchUserId] = useState("");
    const [filteredRoles, setFilteredRoles] = useState([]);

    // Roles pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rolesPerPage = 10;

    // Add Role Modal/Form Toggle & Inputs
    const [showAddRoleForm, setShowAddRoleForm] = useState(false);
    const [roleForm, setRoleForm] = useState({
        name: "",
        description: "",
        parent_id: 0,
        type: 0,
    });

    // Edit permissions state
    const [permissionMatrix, setPermissionMatrix] = useState({}); // { [page_action_id]: boolean }

    // User Roles assignment state
    const [userRolesSelection, setUserRolesSelection] = useState([]); // Array of role IDs

    // Root Configuration inputs
    const [newPageName, setNewPageName] = useState("");
    const [newActionName, setNewActionName] = useState("");
    const [pageActionForm, setPageActionForm] = useState({
        page_id: "",
        action_id: "",
        description: "",
    });

    const addToast = useStore((state) => state.addToast);

    // =========================================================================
    // Data Loading
    // =========================================================================

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, pagesRes, usersRes] = await Promise.all([
                api.get("/auth-permissions/roles"),
                api.get("/auth-permissions/pages"),
                api.get("/organization/users"),
            ]);
            setRoles(rolesRes.data);
            setFilteredRoles(rolesRes.data);
            setPages(pagesRes.data);
            setOrgUsers(usersRes.data);

            if (userRoleSlug === "root") {
                const actionsRes = await api.get("/auth-permissions/actions");
                setActions(actionsRes.data);
            }
        } catch (err) {
            addToast("Failed to load permission architecture data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [userRoleSlug]);

    // Handle search filter for roles
    const handleSearch = (e) => {
        e?.preventDefault();
        let result = roles;

        if (searchRoleName.trim()) {
            result = result.filter((r) =>
                r.name.toLowerCase().includes(searchRoleName.toLowerCase())
            );
        }

        if (searchUserId.trim()) {
            result = result.filter((r) =>
                String(r.created_by) === searchUserId.trim() ||
                (r.creator && r.creator.name.toLowerCase().includes(searchUserId.toLowerCase()))
            );
        }

        setFilteredRoles(result);
        setCurrentPage(1);
    };

    const handleResetSearch = () => {
        setSearchRoleName("");
        setSearchUserId("");
        setFilteredRoles(roles);
        setCurrentPage(1);
    };

    // Pagination helpers
    const indexOfLastRole = currentPage * rolesPerPage;
    const indexOfFirstRole = indexOfLastRole - rolesPerPage;
    const currentRoles = filteredRoles.slice(indexOfFirstRole, indexOfLastRole);
    const totalPages = Math.ceil(filteredRoles.length / rolesPerPage);

    const getPageNumbers = () => {
        const pagesArr = [];
        for (let i = 1; i <= totalPages; i++) {
            pagesArr.push(i);
        }
        return pagesArr;
    };

    // =========================================================================
    // Edit Permission Matrix Logic
    // =========================================================================

    const openPermissionsEdit = (role) => {
        setSelectedRole(role);
        const matrix = {};
        role.role_page_actions?.forEach((rpa) => {
            if (rpa.access === 1) {
                matrix[rpa.page_action_id] = true;
            }
        });
        setPermissionMatrix(matrix);
        setView("permissions");
    };

    const togglePermission = (pageActionId) => {
        setPermissionMatrix((prev) => ({
            ...prev,
            [pageActionId]: !prev[pageActionId],
        }));
    };

    const isAllCheckedForPage = (page) => {
        if (!page.page_actions || page.page_actions.length === 0) return false;
        return page.page_actions.every((pa) => !!permissionMatrix[pa.id]);
    };

    const toggleAllForPage = (page) => {
        if (!page.page_actions || page.page_actions.length === 0) return;
        const allSelected = isAllCheckedForPage(page);

        setPermissionMatrix((prev) => {
            const next = { ...prev };
            page.page_actions.forEach((pa) => {
                next[pa.id] = !allSelected;
            });
            return next;
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        const payload = {
            permissions: Object.keys(permissionMatrix)
                .filter((id) => permissionMatrix[id] === true)
                .map((id) => ({
                    page_action_id: parseInt(id),
                    access: 1,
                })),
        };

        try {
            setLoading(true);
            await api.post(`/auth-permissions/roles/${selectedRole.id}/permissions`, payload);
            addToast("Permissions updated successfully.", "success");
            await loadData();
            setView("roles");
        } catch (err) {
            addToast("Failed to save role permissions.", "error");
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // User Roles Assignment Logic
    // =========================================================================

    const openUserRolesEdit = async (userObj) => {
        setSelectedUser(userObj);
        try {
            setLoading(true);
            const res = await api.get(`/auth-permissions/users/${userObj.id}/roles`);
            setUserRolesSelection(res.data.map((r) => r.id));
            setView("user-roles");
        } catch (err) {
            addToast("Failed to load user roles.", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleUserRoleSelection = (roleId) => {
        setUserRolesSelection((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    };

    const handleSaveUserRoles = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);
            await api.post(`/auth-permissions/users/${selectedUser.id}/roles`, {
                role_ids: userRolesSelection,
            });
            addToast("User roles updated successfully.", "success");
            await loadData();
            setView("roles");
        } catch (err) {
            addToast("Failed to update user roles.", "error");
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // Role CRUD
    // =========================================================================

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!roleForm.name || !roleForm.description) return;

        try {
            setLoading(true);
            const res = await api.post("/auth-permissions/roles", roleForm);
            addToast(`Role "${res.data.name}" created successfully.`, "success");
            setRoleForm({ name: "", description: "", parent_id: 0, type: 0 });
            setShowAddRoleForm(false);
            await loadData();
        } catch (err) {
            addToast(err.response?.data?.message || "Failed to create role.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRole = async (roleId) => {
        if (!confirm("Are you sure you want to delete this role?")) return;

        try {
            setLoading(true);
            await api.delete(`/auth-permissions/roles/${roleId}`);
            addToast("Role deleted successfully.", "success");
            await loadData();
        } catch (err) {
            addToast("Failed to delete role.", "error");
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // Root Settings Operations
    // =========================================================================

    const handleAddPage = async (e) => {
        e.preventDefault();
        if (!newPageName) return;

        try {
            setLoading(true);
            await api.post("/auth-permissions/pages", { name: newPageName });
            addToast(`Page "${newPageName}" added.`, "success");
            setNewPageName("");
            await loadData();
        } catch (err) {
            addToast(err.response?.data?.message || "Failed to add page.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddAction = async (e) => {
        e.preventDefault();
        if (!newActionName) return;

        try {
            setLoading(true);
            await api.post("/auth-permissions/actions", { name: newActionName });
            addToast(`Action "${newActionName}" added.`, "success");
            setNewActionName("");
            await loadData();
        } catch (err) {
            addToast(err.response?.data?.message || "Failed to add action.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleMapPageAction = async (e) => {
        e.preventDefault();
        if (!pageActionForm.page_id || !pageActionForm.action_id || !pageActionForm.description) return;

        try {
            setLoading(true);
            await api.post("/auth-permissions/page-actions", pageActionForm);
            addToast("Page action mapped successfully.", "success");
            setPageActionForm({ page_id: "", action_id: "", description: "" });
            await loadData();
        } catch (err) {
            addToast(err.response?.data?.message || "Failed to map page action.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePageAction = async (id) => {
        if (!confirm("Are you sure you want to remove this mapped action?")) return;

        try {
            setLoading(true);
            await api.delete(`/auth-permissions/page-actions/${id}`);
            addToast("Mapped action removed successfully.", "success");
            await loadData();
        } catch (err) {
            addToast("Failed to remove mapped action.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* View navigation headers (Back to Roles, Tab switches) */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    {view !== "roles" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView("roles")}
                            className="p-1 h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </Button>
                    )}
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
                        {view === "roles" && "Roles Management"}
                        {view === "permissions" && `Edit Permission for ${selectedRole?.name}`}
                        {view === "user-roles" && `${selectedUser?.name}`}
                        {view === "global-config" && "Global Config (Root Only)"}
                    </h2>
                </div>

                <div className="flex gap-2">
                    {view === "roles" && userRoleSlug === "root" && (
                        <Button
                            onClick={() => setView("global-config")}
                            variant="outline"
                            className="text-xs h-9 border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
                        >
                            <Settings className="w-3.5 h-3.5" /> Root Setup
                        </Button>
                    )}
                    {view === "global-config" && (
                        <Button
                            onClick={() => setView("roles")}
                            variant="outline"
                            className="text-xs h-9 border-slate-200 dark:border-slate-800"
                        >
                            Roles Management
                        </Button>
                    )}
                </div>
            </div>

            {/* ================================================================= */}
            {/* 1. ROLES MANAGEMENT VIEW */}
            {/* ================================================================= */}
            {view === "roles" && (
                <div className="space-y-6">
                    {/* Search and filter panel */}
                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                        <CardContent className="p-5">
                            <form onSubmit={handleSearch} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                                            Role Name
                                        </label>
                                        <Input
                                            value={searchRoleName}
                                            onChange={(e) => setSearchRoleName(e.target.value)}
                                            className="bg-white dark:bg-slate-950 h-9"
                                            placeholder="Enter role name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                                            User ID / Creator
                                        </label>
                                        <Input
                                            value={searchUserId}
                                            onChange={(e) => setSearchUserId(e.target.value)}
                                            className="bg-white dark:bg-slate-950 h-9"
                                            placeholder="Enter creator name or ID"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2.5 pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 py-2 px-4 shadow-sm"
                                    >
                                        Search
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleResetSearch}
                                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs h-9 py-2 px-4 shadow-sm"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Inline Add Role Form */}
                    {showAddRoleForm && (
                        <Card className="border border-indigo-100 dark:border-indigo-900/40 p-5 bg-indigo-50/10 dark:bg-indigo-950/10 animate-in slide-in-from-top duration-200">
                            <form onSubmit={handleCreateRole} className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-650 dark:text-indigo-400">Add New Organization Role</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Role Name
                                        </label>
                                        <Input
                                            value={roleForm.name}
                                            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                            placeholder="e.g. BD Team"
                                            required
                                            className="bg-white dark:bg-slate-950 h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Description
                                        </label>
                                        <Input
                                            value={roleForm.description}
                                            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                            placeholder="Role scope or BD details"
                                            required
                                            className="bg-white dark:bg-slate-950 h-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs h-9">
                                        Save Role
                                    </Button>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => setShowAddRoleForm(false)}
                                        className="text-xs h-9 bg-white dark:bg-slate-950"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {/* Roles Table */}
                    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                        <CardContent className="p-0">
                            {/* Action Header above table */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-end">
                                {!showAddRoleForm && (
                                    <Button
                                        onClick={() => setShowAddRoleForm(true)}
                                        className="border border-indigo-650 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-medium text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-all shadow-sm"
                                        variant="outline"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Role
                                    </Button>
                                )}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider font-bold">
                                            <th className="p-4 w-[60px] text-center">#</th>
                                            <th className="p-4">Role Name</th>
                                            <th className="p-4">Description</th>
                                            <th className="p-4">Created By</th>
                                            <th className="p-4 w-[120px] text-center">Permission</th>
                                            <th className="p-4 w-[120px] text-center">User List</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="text-center p-8 text-sm text-slate-400">
                                                    Loading roles...
                                                </td>
                                            </tr>
                                        ) : currentRoles.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center p-8 text-sm text-slate-500">
                                                    No roles found matching the search.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentRoles.map((role, idx) => {
                                                const serialNum = indexOfFirstRole + idx + 1;
                                                return (
                                                    <tr
                                                        key={role.id}
                                                        className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors"
                                                    >
                                                        <td className="p-4 text-center text-xs text-slate-500 font-medium">
                                                            {serialNum}
                                                        </td>
                                                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-50">
                                                            {role.name}
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-650 max-w-[240px] truncate">
                                                            {role.description}
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-600">
                                                            {role.creator?.name || "Shravani testone"}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openPermissionsEdit(role)}
                                                                className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // Assign role to users view - we let the Admin pick users
                                                                    setView("users-list-view");
                                                                    setSelectedRole(role);
                                                                }}
                                                                className="h-8 w-8 p-0 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                                                            >
                                                                <User className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-start items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0 border border-slate-200 dark:border-slate-800"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    {getPageNumbers().map((num) => (
                                        <Button
                                            key={num}
                                            variant={currentPage === num ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => setCurrentPage(num)}
                                            className={`h-8 w-8 p-0 text-xs font-semibold ${
                                                currentPage === num
                                                    ? "bg-indigo-650 hover:bg-indigo-700 text-white"
                                                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400"
                                            }`}
                                        >
                                            {num}
                                        </Button>
                                    ))}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0 border border-slate-200 dark:border-slate-800"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ================================================================= */}
            {/* 2. EDIT PERMISSION MATRIX VIEW */}
            {/* ================================================================= */}
            {view === "permissions" && (
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-50 flex items-center gap-1.5">
                                Edit Permission for <span className="text-indigo-650 dark:text-indigo-400">{selectedRole?.name}</span>
                            </h3>
                            <CardDescription>Grant or deny specific operations inside modules</CardDescription>
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                onClick={() => setView("roles")}
                                variant="outline"
                                className="h-9 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSavePermissions}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs h-9 py-2 px-4 shadow-sm"
                                isLoading={loading}
                            >
                                Save Permissions
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider">
                                        <th className="p-4 w-[60px] text-center">#</th>
                                        <th className="p-4 w-1/4">Page/Modules</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                    {pages.map((page, idx) => {
                                        const isAllChecked = isAllCheckedForPage(page);
                                        return (
                                            <tr key={page.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                                                <td className="p-4 text-center text-xs text-slate-500 font-medium">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                    {page.name}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {/* "All" toggle checkbox */}
                                                        {page.page_actions?.length > 0 && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-700 select-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllChecked}
                                                                    onChange={() => toggleAllForPage(page)}
                                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>All</span>
                                                            </div>
                                                        )}

                                                        {page.page_actions?.length === 0 ? (
                                                            <span className="text-xs text-slate-400 italic py-1">
                                                                No mapped actions
                                                            </span>
                                                        ) : (
                                                            page.page_actions?.map((pa) => {
                                                                const isChecked = !!permissionMatrix[pa.id];
                                                                return (
                                                                    <label
                                                                        key={pa.id}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs cursor-pointer select-none transition-all ${
                                                                            isChecked
                                                                                ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 font-bold dark:bg-indigo-950/20 dark:border-indigo-850 dark:text-indigo-300"
                                                                                : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => togglePermission(pa.id)}
                                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                        <span>{pa.action?.name}</span>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ================================================================= */}
            {/* 3. USERS SELECTION VIEW FOR A ROLE */}
            {/* ================================================================= */}
            {view === "users-list-view" && (
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-50">
                                Team Users for Role: <span className="text-indigo-650 dark:text-indigo-400">{selectedRole?.name}</span>
                            </h3>
                            <CardDescription>Select organization members to manage their role assignments</CardDescription>
                        </div>
                        <Button
                            onClick={() => setView("roles")}
                            variant="outline"
                            className="h-9 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                            Back to Roles
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-850">
                        {orgUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 p-8 text-center">No users in organization.</p>
                        ) : (
                            orgUsers.map((member, idx) => (
                                <div
                                    key={member.id}
                                    onClick={() => openUserRolesEdit(member)}
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 font-semibold">{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-slate-550">{member.email}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-semibold"
                                    >
                                        Assign Roles
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ================================================================= */}
            {/* 4. USER ROLES ASSIGNMENT CHECKLIST VIEW */}
            {/* ================================================================= */}
            {view === "user-roles" && (
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-50">
                                {selectedUser?.name}
                            </h3>
                            <CardDescription>Assign multiple access roles to this user</CardDescription>
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                onClick={() => setView("users-list-view")}
                                variant="outline"
                                className="h-9 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveUserRoles}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs h-9 py-2 px-4 shadow-sm"
                                isLoading={loading}
                            >
                                Save Roles
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider">
                                    <th className="p-4 w-[60px] text-center">#</th>
                                    <th className="p-4">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {roles.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="text-center p-8 text-sm text-slate-500">
                                            No roles created yet.
                                        </td>
                                    </tr>
                                ) : (
                                    roles.map((role, idx) => {
                                        const isChecked = userRolesSelection.includes(role.id);
                                        return (
                                            <tr
                                                key={role.id}
                                                onClick={() => toggleUserRoleSelection(role.id)}
                                                className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                                            >
                                                <td className="p-4 text-center text-xs text-slate-500 font-medium">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}} // handled by row click
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <div className="space-y-0.5">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-50 text-sm">
                                                            {role.name}
                                                        </span>
                                                        <p className="text-xs text-slate-500">{role.description}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* ================================================================= */}
            {/* 5. GLOBAL CONFIGURATION VIEW (ROOT ONLY) */}
            {/* ================================================================= */}
            {view === "global-config" && userRoleSlug === "root" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Page configuration */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Configure System Pages</CardTitle>
                                <CardDescription>Define pages where permissions apply</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={handleAddPage} className="flex gap-2">
                                    <Input
                                        value={newPageName}
                                        onChange={(e) => setNewPageName(e.target.value)}
                                        placeholder="e.g. Campaigns"
                                        required
                                        className="bg-white dark:bg-slate-950 h-9"
                                    />
                                    <Button type="submit" className="bg-indigo-650 text-white text-xs h-9">
                                        Add Page
                                    </Button>
                                </form>
                                <div className="space-y-1">
                                    {pages.map((p) => (
                                        <div key={p.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                                            <span>{p.name}</span>
                                            <Badge variant="outline" className="text-[10px] text-slate-505 border-slate-200">
                                                ID: {p.id}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action configuration */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Configure System Actions</CardTitle>
                                <CardDescription>Define system operations available</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={handleAddAction} className="flex gap-2">
                                    <Input
                                        value={newActionName}
                                        onChange={(e) => setNewActionName(e.target.value)}
                                        placeholder="e.g. edit_content"
                                        required
                                        className="bg-white dark:bg-slate-950 h-9"
                                    />
                                    <Button type="submit" className="bg-indigo-650 text-white text-xs h-9">
                                        Add Action
                                    </Button>
                                </form>
                                <div className="space-y-1">
                                    {actions.map((a) => (
                                        <div key={a.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                                            <span>{a.name}</span>
                                            <Badge variant="outline" className="text-[10px] text-slate-505 border-slate-200">
                                                ID: {a.id}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Page Actions Mapping configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Link Pages to Actions (Define Page-Actions)</CardTitle>
                            <CardDescription>Configure which actions exist on a page</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleMapPageAction} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Page
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                                        value={pageActionForm.page_id}
                                        onChange={(e) => setPageActionForm({ ...pageActionForm, page_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Page</option>
                                        {pages.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Action
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                                        value={pageActionForm.action_id}
                                        onChange={(e) => setPageActionForm({ ...pageActionForm, action_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Action</option>
                                        {actions.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 sm:col-span-2 flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Description
                                        </label>
                                        <Input
                                            value={pageActionForm.description}
                                            onChange={(e) => setPageActionForm({ ...pageActionForm, description: e.target.value })}
                                            placeholder="Description of this permission"
                                            required
                                            className="bg-white dark:bg-slate-950 h-9"
                                        />
                                    </div>
                                    <Button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white h-10 text-xs font-semibold">
                                        Map Permission
                                    </Button>
                                </div>
                            </form>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                                <div className="grid grid-cols-12 p-3 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-3">Page</div>
                                    <div className="col-span-3">Action</div>
                                    <div className="col-span-5">Description</div>
                                    <div className="col-span-1 text-right">Delete</div>
                                </div>
                                {pages.flatMap((page) =>
                                    page.page_actions?.map((pa) => (
                                        <div key={pa.id} className="grid grid-cols-12 p-3 items-center text-sm">
                                            <div className="col-span-3 font-semibold text-slate-900 dark:text-slate-50">
                                                {page.name}
                                            </div>
                                            <div className="col-span-3">
                                                <Badge className="bg-indigo-100 text-indigo-700 border-none dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">
                                                    {pa.action?.name}
                                                </Badge>
                                            </div>
                                            <div className="col-span-5 text-slate-550 text-xs">
                                                {pa.description}
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemovePageAction(pa.id)}
                                                    className="text-red-500 hover:text-red-650 h-8 w-8 p-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
