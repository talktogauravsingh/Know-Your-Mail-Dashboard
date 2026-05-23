import React from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export default function MyProfile() {
    return (
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
    );
}
