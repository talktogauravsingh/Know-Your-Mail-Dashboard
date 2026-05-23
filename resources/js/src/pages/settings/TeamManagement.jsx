import React from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export default function TeamManagement() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            Manage who has access to this workspace.
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
                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                                        Gaurav Singh{" "}
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 text-[10px] py-0"
                                        >
                                            You
                                        </Badge>
                                    </div>
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
                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                                        Sarah Marketing
                                    </div>
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
    );
}
