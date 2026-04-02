"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { QueueEntryService } from "@/services/queueService";
import {
    CheckCircle2,
    Play,
    ChevronDown,
    Wallet,
    X
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

    const renderPaymentAction = () => (
        <div className="relative w-full mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsPaymentMenuOpen(!isPaymentMenuOpen);
                }}
                className={cn(
                    "w-full h-11 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] border",
                    isPaymentMenuOpen 
                        ? "bg-white border-slate-200 text-slate-900 shadow-slate-100" 
                        : "bg-slate-900 border-transparent text-white shadow-slate-300 hover:bg-slate-800"
                )}
            >
                <Wallet className={cn("h-4 w-4 transition-transform", isPaymentMenuOpen && "scale-110")} />
                {t('queue.mark_paid') || 'Mark Paid'}
            </button>

            <AnimatePresence mode="wait">
                {isPaymentMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-[90]" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPaymentMenuOpen(false);
                            }} 
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: -8, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 right-0 z-[100] mb-2 bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 p-2 overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-slate-100/50 mb-1 flex items-center justify-between">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('queue.select_method') || 'Select Payment Method'}</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsPaymentMenuOpen(false); }}
                                    className="p-1 hover:bg-slate-50 rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4 text-slate-300" />
                                </button>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 p-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdatePayment?.('cash'); setIsPaymentMenuOpen(false); }}
                                    className="group w-full px-4 py-4 text-left hover:bg-emerald-50 rounded-2xl transition-all flex items-center justify-between active:bg-emerald-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-emerald-200/50 text-2xl">
                                            💵
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-[13px] font-black text-slate-900 leading-tight">{t('queue.cash')}</span>
                                            <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-tighter">{t('payment.offline')}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdatePayment?.('qr'); setIsPaymentMenuOpen(false); }}
                                    className="group w-full px-4 py-4 text-left hover:bg-blue-50 rounded-2xl transition-all flex items-center justify-between active:bg-blue-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-blue-200/50 text-2xl">
                                            📱
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-[13px] font-black text-slate-900 leading-tight">{t('queue.qr_upi') || 'UPI / QR'}</span>
                                            <span className="text-[10px] font-bold text-blue-600/70 uppercase tracking-tighter">{t('payment.digital')}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    // Case: No services yet (Waiting state)
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
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic text-center px-4">
                        {isInitializing ? t('queue.preparing') : t('queue.waiting_to_start')}
                    </span>
                </div>
                {isPendingPayment && renderPaymentAction()}
            </div>
        );
    }

    // Case: Active Service (Serving or Completed)
    return (
        <div className="flex flex-col gap-2 w-full">
            {services.map((s) => {
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
            {isPendingPayment && renderPaymentAction()}
        </div>
    );
};
