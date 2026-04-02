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
    Info,
    Wallet,
    X,
    QrCode,
    Banknote
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceExecutionStripProps {
    services: QueueEntryService[];
    providers: any[];
    entryJoinedAt: string;
    expectedStartTime?: string;
    now: number;
    onAssignProvider: (taskId: string, providerId: string) => void;
    onStartTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
    onInitialize?: (providerId?: string) => void;
    isPendingPayment?: boolean;
    onUpdatePayment?: (method: 'cash' | 'qr' | 'card' | 'unpaid') => void;
}

export const ServiceExecutionStrip: React.FC<ServiceExecutionStripProps> = ({
    services,
    providers,
    entryJoinedAt,
    expectedStartTime,
    now,
    onAssignProvider,
    onStartTask,
    onCompleteTask,
    onInitialize,
    isPendingPayment,
    onUpdatePayment
}) => {
    const { t } = useLanguage();
    const [isInitializing, setIsInitializing] = React.useState(false);
    const [isPaymentMenuOpen, setIsPaymentMenuOpen] = React.useState(false);

    // If services are not yet initialized, show a template dropdown that triggers auto-initialization
    if (!services || services.length === 0) {
        return (
            <div className="flex flex-col gap-2 w-full animate-in fade-in duration-500">
                <div className="relative group">
                    <select
                        value=""
                        disabled={isInitializing}
                        onChange={(e) => {
                            if (e.target.value) {
                                setIsInitializing(true);
                                onInitialize?.(e.target.value);
                            }
                        }}
                        className={cn(
                            "w-full h-10 border border-slate-100 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest outline-none appearance-none transition-all cursor-pointer shadow-sm",
                            isInitializing 
                                ? "bg-slate-100 text-slate-400 opacity-50 cursor-wait" 
                                : "bg-white text-slate-500 hover:border-indigo-200"
                        )}
                    >
                        <option value="">{isInitializing ? t('queue.starting') || 'Starting...' : t('queue.select_expert')}</option>
                        {providers.filter(p => p.is_active).map(p => (
                            <option key={p.id} value={p.id} className="font-sans py-2 text-slate-900">
                                {p.name} {p.current_tasks_count > 0 ? `· ${t('queue.busy')}` : !p.is_available ? `· ${t('queue.away')}` : ""}
                            </option>
                        ))}
                    </select>
                    {!isInitializing && (
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    )}
                </div>
                <div className="h-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                        {isInitializing ? (t('queue.preparing') || 'Preparing Service Area...') : (t('queue.waiting_to_start') || 'Select Expert to Start')}
                    </span>
                </div>
            </div>
        );
    }

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
                                <option value="" className="text-slate-400">{t('queue.select_expert')}</option>
                                {providers.filter(p => p.is_active || p.id === s.assigned_provider_id).map(p => {
                                    const isBusy = p.current_tasks_count > 0;
                                    const onLeave = p.is_available === false;
                                    return (
                                        <option key={p.id} value={p.id} className="font-sans py-2 text-slate-900">
                                            {p.name} {isBusy ? `· ${t('queue.busy')}` : onLeave ? `· ${t('queue.away')}` : ""}
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
                                className="w-full h-10 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                <Play className="h-3 w-3 fill-current" />
                                {t('queue.start_service')}
                            </button>
                        )}

                        {isInProgress && (
                            <button
                                onClick={() => onCompleteTask(s.id)}
                                className="w-full h-10 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                {t('queue.done')}
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Post-Service Payment Action */}
            {isPendingPayment && (
                <div className="relative w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                        onClick={() => setIsPaymentMenuOpen(!isPaymentMenuOpen)}
                        className={cn(
                            "w-full h-11 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                            isPaymentMenuOpen 
                                ? "bg-white border-2 border-slate-200 text-slate-900 shadow-slate-100" 
                                : "bg-slate-900 text-white shadow-slate-300 hover:bg-slate-800"
                        )}
                    >
                        <Wallet className={cn("h-4 w-4 transition-transform", isPaymentMenuOpen && "scale-110")} />
                        {t('queue.mark_paid') || 'Mark Paid'}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isPaymentMenuOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {isPaymentMenuOpen && (
                            <>
                                {/* Backdrop to close on click outside */}
                                <div 
                                    className="fixed inset-0 z-[90]" 
                                    onClick={() => setIsPaymentMenuOpen(false)} 
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: -8, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 right-0 z-[100] mb-2 bg-white/90 backdrop-blur-xl rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 p-2 overflow-hidden"
                                >
                                    <div className="px-4 py-3 border-b border-slate-100/50 mb-1 flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('queue.select_method') || 'Select Payment'}</p>
                                        <X 
                                            className="h-3 w-3 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors" 
                                            onClick={() => setIsPaymentMenuOpen(false)} 
                                        />
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => { onUpdatePayment?.('cash'); setIsPaymentMenuOpen(false); }}
                                            className="group w-full px-4 py-3.5 text-left hover:bg-emerald-50 rounded-2xl transition-all flex items-center gap-4 active:bg-emerald-100"
                                        >
                                            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <Banknote className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 leading-tight">{t('queue.cash')}</span>
                                                <span className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-tighter">{t('payment.offline')}</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { onUpdatePayment?.('qr'); setIsPaymentMenuOpen(false); }}
                                            className="group w-full px-4 py-3.5 text-left hover:bg-blue-50 rounded-2xl transition-all flex items-center gap-4 active:bg-blue-100"
                                        >
                                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <QrCode className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 leading-tight">{t('queue.qr_upi') || 'UPI / QR'}</span>
                                                <span className="text-[9px] font-bold text-blue-600/70 uppercase tracking-tighter">{t('payment.digital')}</span>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
