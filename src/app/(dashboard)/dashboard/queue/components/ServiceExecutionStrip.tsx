"use client";

import React from 'react';
import { createPortal } from "react-dom";
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
    preselectedProviderId?: string;
    entryStatus?: string;
    entryJoinedAt: string;
    expectedStartTime?: string;
    now: number;
    onAssignProvider: (taskId: string, providerId: string) => void;
    onStartTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
    onInitialize?: (providerId?: string) => Promise<void> | void;
    isPendingPayment?: boolean;
    onUpdatePayment?: (method: 'cash' | 'qr' | 'card' | 'unpaid') => void;
}

export const ServiceExecutionStrip: React.FC<ServiceExecutionStripProps> = ({
    services,
    providers,
    preselectedProviderId,
    entryStatus,
    onAssignProvider,
    onStartTask,
    onCompleteTask,
    onInitialize,
    isPendingPayment,
    onUpdatePayment
}) => {
    const { t, language } = useLanguage();
    const getProviderName = React.useCallback((p: any) => {
        const tr = p?.translations?.[language];
        if (typeof tr === "object" && tr?.name) return tr.name;
        return p?.name || "";
    }, [language]);

    const [isInitializing, setIsInitializing] = React.useState(false);
    const [localSelectedProviderId, setLocalSelectedProviderId] = React.useState<string>("");
    const preselectedProvider = React.useMemo(() => {
        if (!preselectedProviderId) return null;
        return providers.find((p) => String(p.id) === String(preselectedProviderId)) || null;
    }, [providers, preselectedProviderId]);
    const effectiveProviderId = preselectedProviderId || localSelectedProviderId;
    const effectiveProvider = React.useMemo(() => {
        if (!effectiveProviderId) return null;
        return providers.find((p) => String(p.id) === String(effectiveProviderId)) || null;
    }, [providers, effectiveProviderId]);

    React.useEffect(() => {
        if (preselectedProviderId) {
            setLocalSelectedProviderId(preselectedProviderId);
        }
    }, [preselectedProviderId]);

    const [isPaymentMenuOpen, setIsPaymentMenuOpen] = React.useState(false);
    const paymentButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const [paymentMenuPos, setPaymentMenuPos] = React.useState<{ top: number; left: number; width: number; placement: 'top' | 'bottom' } | null>(null);
    const paymentMenuRef = React.useRef<HTMLDivElement | null>(null);
    const [paymentMenuSize, setPaymentMenuSize] = React.useState<{ w: number; h: number } | null>(null);

    // Keep the menu fully visible without forcing page scroll.
    // Fallback size until first measurement (header + 2 items + padding).
    const FALLBACK_MENU_H = 168;
    const FALLBACK_MENU_W = 224; // Tailwind w-56

    const updatePaymentMenuPos = React.useCallback(() => {
        const btn = paymentButtonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const viewportPadding = 8;
        const vw = typeof window !== "undefined" ? window.innerWidth : 0;
        const vh = typeof window !== "undefined" ? window.innerHeight : 0;
        const menuW = paymentMenuSize?.w || FALLBACK_MENU_W;
        const menuH = paymentMenuSize?.h || FALLBACK_MENU_H;

        // Horizontal clamp so the popover never goes off-screen on mobile.
        // We clamp the LEFT EDGE (not center) to avoid translate issues on tiny screens.
        const preferredLeftEdge = rect.left + rect.width / 2 - (menuW / 2);
        const minLeftEdge = viewportPadding;
        const maxLeftEdge = Math.max(minLeftEdge, vw - viewportPadding - menuW);
        const clampedLeftEdge = Math.min(Math.max(preferredLeftEdge, minLeftEdge), maxLeftEdge);

        // Vertical: prefer below, but flip above if not enough space.
        const belowTop = rect.bottom + 2;
        const aboveTop = rect.top - menuH - 2;
        const fitsBelow = belowTop + menuH <= (vh - viewportPadding);
        const fitsAbove = aboveTop >= viewportPadding;
        const placement: 'top' | 'bottom' = fitsBelow || !fitsAbove ? 'bottom' : 'top';
        const chosenTop = placement === 'bottom' ? belowTop : aboveTop;

        setPaymentMenuPos({
            top: Math.max(viewportPadding, Math.min(chosenTop, vh - menuH - viewportPadding || chosenTop)),
            left: clampedLeftEdge,
            width: rect.width,
            placement
        });
    }, [paymentMenuSize]);

    React.useLayoutEffect(() => {
        if (!isPaymentMenuOpen) return;
        updatePaymentMenuPos();
        // Measure actual rendered menu size (fonts / zoom can change it on mobile)
        const measure = () => {
            const el = paymentMenuRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.width && r.height) setPaymentMenuSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
        };
        requestAnimationFrame(measure);
        const onAnyScroll = () => requestAnimationFrame(updatePaymentMenuPos);
        const onResize = () => requestAnimationFrame(updatePaymentMenuPos);
        window.addEventListener("scroll", onAnyScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onAnyScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [isPaymentMenuOpen, updatePaymentMenuPos]);

    const renderPaymentAction = () => (
        <div className="relative w-full flex flex-col items-center mt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-400">
            <button
                ref={paymentButtonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsPaymentMenuOpen(!isPaymentMenuOpen);
                }}
                className={cn(
                    "w-fit min-w-[140px] px-5 h-8 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] border border-slate-100",
                    isPaymentMenuOpen 
                        ? "bg-white text-slate-900 border-slate-200" 
                        : "bg-slate-900 text-white border-transparent hover:bg-slate-800"
                )}
            >
                <Wallet className={cn("h-3 w-3 transition-transform", isPaymentMenuOpen && "scale-110")} />
                {t('queue.mark_paid') || 'Mark Paid'}
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", isPaymentMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence mode="wait">
                {isPaymentMenuOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-90" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPaymentMenuOpen(false);
                            }} 
                        />
                        {typeof document !== "undefined" && paymentMenuPos
                            ? createPortal(
                                <motion.div
                                    ref={paymentMenuRef}
                                    initial={{ opacity: 0, y: paymentMenuPos.placement === 'bottom' ? -6 : 6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: paymentMenuPos.placement === 'bottom' ? -6 : 6, scale: 0.98 }}
                                    className="fixed z-200 w-56 bg-white rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.16)] border border-slate-100 p-1.5"
                                    style={{
                                        top: paymentMenuPos.top,
                                        left: paymentMenuPos.left,
                                        maxWidth: "calc(100vw - 16px)"
                                    }}
                                >
                                    <div className="px-3 py-1 border-b border-slate-50 mb-1 flex items-center justify-between">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('queue.select_method') || 'Pay'}</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsPaymentMenuOpen(false); }}
                                            className="p-1 hover:bg-slate-50 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3 text-slate-300" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdatePayment?.('cash'); setIsPaymentMenuOpen(false); }}
                                            className="group w-full px-3 py-2 text-left hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-between active:bg-emerald-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform text-base">
                                                    💵
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-800 tracking-tight">{t('queue.cash')}</span>
                                            </div>
                                            <div className="h-1 w-1 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdatePayment?.('qr'); setIsPaymentMenuOpen(false); }}
                                            className="group w-full px-3 py-2 text-left hover:bg-blue-50 rounded-xl transition-all flex items-center justify-between active:bg-blue-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform text-base">
                                                    📱
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-800 tracking-tight">{t('queue.qr_upi') || 'UPI'}</span>
                                            </div>
                                            <div className="h-1 w-1 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </div>
                                </motion.div>,
                                document.body
                              )
                            : null}
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    // Case: No services yet (Waiting state)
    if (!services || services.length === 0) {
        if (effectiveProviderId) {
            return (
                <div className="flex flex-col gap-1.5 w-full animate-in fade-in duration-500">
                    <div className="h-10 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 flex items-center justify-between">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                            {getProviderName(effectiveProvider) || t('queue.assigned_expert') || 'Assigned Expert'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setIsInitializing(true);
                            Promise.resolve(onInitialize?.(effectiveProviderId))
                                .finally(() => setIsInitializing(false));
                        }}
                        disabled={isInitializing}
                        className="w-full h-10 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                    >
                        <Play className="h-3 w-3 fill-current" />
                        {isInitializing ? (t('queue.starting') || 'Starting...') : t('queue.start_service')}
                    </button>
                    {isPendingPayment && renderPaymentAction()}
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-1.5 w-full animate-in fade-in duration-500">
                <div className="relative group">
                    <select
                        value=""
                        disabled={isInitializing}
                        onChange={(e) => {
                            if (e.target.value) {
                                setIsInitializing(true);
                                setLocalSelectedProviderId(e.target.value);
                                Promise.resolve(onInitialize?.(e.target.value))
                                    .finally(() => setIsInitializing(false));
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
                                {getProviderName(p)} {p.current_tasks_count > 0 ? `· ${t('queue.busy')}` : !p.is_available ? `· ${t('queue.away')}` : ""}
                            </option>
                        ))}
                    </select>
                    {!isInitializing && (
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    )}
                </div>
                <div className="h-9 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
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
        <div className="flex flex-col gap-1.5 w-full">
            {services.map((s) => {
                const status = String(s.task_status || 'pending').toLowerCase().trim();
                const isDone = status === 'done' || status === 'completed';
                const entryIsServing = String(entryStatus || '').toLowerCase() === 'serving';
                // Professional fallback:
                // if parent entry is serving and task is assigned but still marked pending,
                // treat it as in-progress so owner can always complete it.
                const isInProgress =
                    status === 'in_progress' ||
                    status === 'in-progress' ||
                    status === 'serving' ||
                    (!isDone && entryIsServing && !!s.assigned_provider_id);
                const isPending = !isDone && !isInProgress;

                return (
                    <div key={s.id} className="flex flex-col gap-1.5">
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
                                    const isSelected = String(p.id) === String(s.assigned_provider_id || "");
                                    const isBusy = p.current_tasks_count > 0;
                                    const onLeave = p.is_available === false;
                                    const availabilitySuffix = !isSelected
                                        ? (isBusy ? `· ${t('queue.busy')}` : onLeave ? `· ${t('queue.away')}` : "")
                                        : "";
                                    return (
                                        <option key={p.id} value={p.id} className="font-sans py-2 text-slate-900">
                                            {getProviderName(p)} {availabilitySuffix}
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
