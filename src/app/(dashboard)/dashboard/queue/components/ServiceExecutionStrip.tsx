"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { QueueEntryService } from "@/services/queueService";
import {
    CheckCircle2,
    Circle,
    Play,
    UserCheck,
    ChevronDown,
    Clock,
    Info
} from "lucide-react";

interface ServiceExecutionStripProps {
    services: QueueEntryService[];
    providers: any[];
    entryJoinedAt: string;
    expectedStartTime?: string;
    now: number;
    onAssignProvider: (taskId: string, providerId: string) => void;
    onStartTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
}

export const ServiceExecutionStrip: React.FC<ServiceExecutionStripProps> = ({
    services,
    providers,
    entryJoinedAt,
    expectedStartTime,
    now,
    onAssignProvider,
    onStartTask,
    onCompleteTask
}) => {
    if (!services || services.length === 0) return null;

    // For simplicity, we'll focus on the first service if multiple exist, 
    // or we could map them. The mockup shows one main service area per row.
    return (
        <div className="flex flex-col gap-2 w-full">
            {services.map((s, idx) => {
                const status = s.task_status || 'pending';
                const isDone = status === 'done';
                const isInProgress = status === 'in_progress';
                const isPending = status === 'pending';

                return (
                    <div key={s.id} className="flex flex-col gap-2">
                        {/* Expert Selector */}
                        <div className="relative group">
                            <select
                                value={s.assigned_provider_id || ""}
                                onChange={(e) => onAssignProvider(s.id, e.target.value)}
                                disabled={isDone || isInProgress}
                                className={cn(
                                    "w-full h-10 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none appearance-none hover:border-indigo-100 transition-all cursor-pointer shadow-sm",
                                    (isDone || isInProgress) && "cursor-default border-transparent bg-indigo-50/50 text-indigo-600 px-0 shadow-none text-xs"
                                )}
                            >
                                <option value="" className="text-slate-400">SELECT EXPERT...</option>
                                {providers.filter(p => p.is_active || p.id === s.assigned_provider_id).map(p => {
                                    const isBusy = p.current_tasks_count > 0;
                                    const onLeave = p.is_available === false;
                                    return (
                                        <option key={p.id} value={p.id} className="font-sans py-2 text-slate-900">
                                            {p.name} {isBusy ? "· Busy" : onLeave ? "· Away" : ""}
                                        </option>
                                    );
                                })}
                            </select>
                            {!isDone && !isInProgress && (
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            )}
                        </div>

                        {/* Action Buttons */}
                        {isPending && (
                            <button
                                onClick={() => onStartTask(s.id)}
                                disabled={!s.assigned_provider_id}
                                className="w-full h-10 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-slate-200"
                            >
                                Start Service
                            </button>
                        )}

                        {isInProgress && (
                            <button
                                onClick={() => onCompleteTask(s.id)}
                                className="w-full h-10 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                            >
                                Done
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
