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
import { useStore } from "../../store/useStore";
import { Eye, EyeOff } from "lucide-react";

export default function MyProfile() {
    const user = useStore((state) => state.user);
    const updateProfile = useStore((state) => state.updateProfile);
    const isLoading = useStore((state) => state.isLoading);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                password: "",
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        try {
            const payload = { ...formData };
            if (!payload.password) {
                delete payload.password;
            }
            await updateProfile(payload);
        } catch (err) {
            // Toast handled by store
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>
                        Update your personal information.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                    Full Name
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="dark:bg-slate-950"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                    Email Address
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="dark:bg-slate-950"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                        Password (leave blank to keep current)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                                        ) : (
                                            <><Eye className="h-3.5 w-3.5" /> Show</>
                                        )}
                                    </button>
                                </div>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="dark:bg-slate-950"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                            isLoading={isLoading}
                        >
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
