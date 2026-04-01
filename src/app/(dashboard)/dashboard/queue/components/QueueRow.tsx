"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { QueueEntry } from "@/services/queueService";
import {
    Calendar,
    Bell,
    Phone,
    Timer,
    ArrowRightToLine,
    QrCode,
    RefreshCcw,
    RotateCcw,
    Play,
    Globe,
    CheckCheck,
    ChevronDown,
    Users,
    UserMinus,
    MessageCircle,
    Megaphone,
    Wallet,
    X
} from "lucide-react";
import { ServiceExecutionStrip } from "./ServiceExecutionStrip";
import { StatusBadge, UI_TOKENS } from "@/components/dashboard/DashboardUI";
import { useLanguage } from "@/context/LanguageContext";

interface QueueRowProps {
    item: QueueEntry;
    business: { id: string; name: string; owner_id: string; slug: string; address?: string } | null;
    providers: any[];
    onAssignTaskProvider: (taskId: string, providerId: string) => void;
    onStartTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
    onUpdateStatus: (id: string, status: QueueEntry['status']) => void;
    onUpdatePayment: (id: string, method: 'cash' | 'qr' | 'card' | 'unpaid') => void;
    onNoShow: (id: string) => void;
    onRestore: (id: string) => void;
    onSkip: (id: string) => void;
    onInitializeTasks: () => void;
    onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const QueueRow: React.FC<QueueRowProps> = ({
    item,
    business,
    providers,
    onAssignTaskProvider,
    onStartTask,
    onCompleteTask,
    onUpdateStatus,
    onUpdatePayment,
    onNoShow,
    onRestore,
    onSkip,
    onInitializeTasks,
    onShowToast
}) => {
    const { t } = useLanguage();
    const [now, setNow] = useState(Date.now());
    const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
    const [showNoShowModal, setShowNoShowModal] = useState(false);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [wasAutoOpened, setWasAutoOpened] = useState(false);

    const s = (item.status || "").toLowerCase().trim();
    const isServingOrCompleted = ['serving', 'completed', 'done', 'skipped', 'no_show'].includes(s);
    const isPendingPayment = (s === 'completed' || s === 'serving') && (item.payment_method === 'unpaid' || !item.payment_method);

    // Auto-open payment menu when last task is completed
    useEffect(() => {
        if (isPendingPayment && !wasAutoOpened) {
            setIsPaymentMenuOpen(true);
            setWasAutoOpened(true);
        } else if (!isPendingPayment) {
            setWasAutoOpened(false);
        }
    }, [isPendingPayment, wasAutoOpened]);

    // Delay computations
    const apptStartTime = item.appointments?.start_time ? new Date(item.appointments.start_time).getTime() : null;
    const apptDelay = (apptStartTime && item.status === 'waiting') ? Math.max(0, Math.floor((now - apptStartTime) / 60000)) : 0;
    const serviceDelay = item.queue_entry_services?.reduce((acc, s) => acc + (s.delay_minutes || 0), 0) || item.delay_minutes || 0;
    const delayMins = Math.max(apptDelay, serviceDelay);
    const isDelayed = delayMins >= 10;
    const baseDateStr = item.appointments?.start_time || item.joined_at;
    const expectedTime = new Date(new Date(baseDateStr).getTime() + delayMins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const delayKey = `delay_notified_${item.id}`;
    const [hasNotifiedDelay, setHasNotifiedDelay] = useState(() => {
        if (typeof window !== 'undefined') return sessionStorage.getItem(delayKey) === 'true';
        return false;
    });

    // Timing Logic
    const joinedTime = new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const startedTime = item.queue_entry_services?.find(s => s.started_at)?.started_at
        ? new Date(item.queue_entry_services.find(s => s.started_at)!.started_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={cn(
            "group relative bg-white rounded-[24px] border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden",
            s === 'no_show' && "opacity-75 grayscale-[0.3]"
        )}>
            {/* Side Status Indicator */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500",
                s === 'serving' ? "bg-blue-600" :
                    s === 'waiting' ? "bg-amber-500" :
                        s === 'completed' ? "bg-emerald-500" :
                            s === 'no_show' ? "bg-rose-600" : "bg-slate-300"
            )} />

            <div className="pl-4 p-4">
                {/* TOP ROW: Position + Name + Status badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 font-black rounded-full text-[10px] border border-indigo-100">
                            #{item.position}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-900 tracking-tight capitalize break-words leading-tight">
                                {item.customer_name || t('queue.guest')}
                            </h3>
                            <p className="text-xs font-bold text-slate-500 tabular-nums">{item.phone || t('queue.no_phone')}</p>
                            <div className="flex items-center gap-1 opacity-60 mt-0.5">
                                <QrCode className="h-3 w-3 text-slate-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {t('queue.ref')}: {item.id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Status badges top right */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="transition-transform group/payment">
                            <StatusBadge 
                                status={item.payment_method === 'unpaid' || !item.payment_method ? 'unpaid' : 'paid'} 
                            />
                        </div>
                        <StatusBadge status={item.status} />
                    </div>
                </div>

                {/* SHARED PAYMENT MENU - Can be opened from badge or end-of-service button */}
                <div className="relative">
                    {isPaymentMenuOpen && (
                        <div className="absolute top-0 right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between px-2 pt-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('queue.select_method') || 'Select Method'}</p>
                                <button onClick={() => setIsPaymentMenuOpen(false)} className="text-slate-300 hover:text-slate-500">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                            <button
                                onClick={() => { onUpdatePayment(item.id, 'cash'); setIsPaymentMenuOpen(false); }}
                                className="px-3 py-2.5 text-left text-xs font-black hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 rounded-xl text-slate-700 transition-all flex items-center gap-2 border border-transparent hover:border-emerald-200"
                            >
                                <span className="h-5 w-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">💵</span>
                                {t('queue.cash')}
                                {item.payment_method === 'cash' && <CheckCheck className="h-3 w-3 ml-auto text-emerald-500" />}
                            </button>
                            <button
                                onClick={() => { onUpdatePayment(item.id, 'qr'); setIsPaymentMenuOpen(false); }}
                                className="px-3 py-2.5 text-left text-xs font-black hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 rounded-xl text-slate-700 transition-all flex items-center gap-2 border border-transparent hover:border-blue-200"
                            >
                                <span className="h-5 w-5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">📱</span>
                                {t('queue.qr_upi')}
                                {item.payment_method === 'qr' && <CheckCheck className="h-3 w-3 ml-auto text-blue-500" />}
                            </button>
                            {(item.payment_method && item.payment_method !== 'unpaid') && (
                                <button
                                    onClick={() => { onUpdatePayment(item.id, 'unpaid'); setIsPaymentMenuOpen(false); }}
                                    className="px-3 py-2.5 text-left text-[10px] font-bold text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                    {t('queue.reset_to_unpaid') || 'Reset to Unpaid'}
                                </button>
                            )}
                        </div>
                    )}
                </div>


                {/* SERVICE + TIMING ROW */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 pl-1">
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">
                        {item.queue_entry_services?.[0]?.services?.name || 'Service'}
                    </h4>
                    {isDelayed && item.status === 'waiting' && (
                        <div className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {t('status.late')} {delayMins}{t('queue.min')}
                        </div>
                    )}
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider">{t('queue.timing')}:</span>
                        <span className="text-slate-700 tabular-nums">{joinedTime}</span>
                        <span className="text-slate-200">|</span>
                        <span className={startedTime ? "text-blue-600" : "text-slate-500"}>
                            {startedTime ? startedTime : expectedTime}
                        </span>
                    </div>
                </div>

                {/* ACTIONS ROW */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* WhatsApp quick actions */}
                        {item.status !== 'completed' && item.status !== 'no_show' && (
                            <div className="flex items-center gap-1.5 border-r border-slate-100 pr-2">
                                <button
                                    onClick={() => {
                                        if (!item.phone || !business) { onShowToast(t('queue.no_phone'), "error"); return; }
                                        const cleanPhone = item.phone.replace(/\D/g, '');
                                        const name = item.customer_name || t('queue.guest');
                                        const customerLang = (item as any).profiles?.ui_language;
                                        const message = encodeURIComponent(t('queue.wa_delay_msg', { name, business: business.name }, customerLang));
                                        window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                                        sessionStorage.setItem(delayKey, 'true');
                                        setHasNotifiedDelay(true);
                                    }}
                                    className={cn(
                                        "h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0",
                                        isDelayed && !hasNotifiedDelay ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10"
                                    )}
                                    title={t('queue.whatsapp_delay_alert')}
                                >
                                    <Timer className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!item.phone || !business) { onShowToast(t('queue.no_phone'), "error"); return; }
                                        const cleanPhone = item.phone.replace(/\D/g, '');
                                        const name = item.customer_name || t('queue.guest');
                                        const customerLang = (item as any).profiles?.ui_language;
                                        const message = encodeURIComponent(t('queue.wa_next_msg', { name, business: business.name }, customerLang));
                                        window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all active:scale-90 shrink-0"
                                    title={t('queue.whatsapp_youre_next')}
                                >
                                    <Megaphone className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!item.phone || !business) return;
                                        const cleanPhone = item.phone.replace(/\D/g, '');
                                        const name = item.customer_name || t('queue.guest');
                                        const customerLang = (item as any).profiles?.ui_language;
                                        const message = encodeURIComponent(t('queue.wa_ready_msg', { name, business: business.name }, customerLang));
                                        window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all active:scale-90 border border-[#25D366]/20 shrink-0"
                                    title={t('queue.whatsapp_turn_ready')}
                                >
                                    <MessageCircle className="h-4 w-4 fill-current opacity-20" />
                                </button>
                            </div>
                        )}

                        {/* Skip / No-show / Restore */}
                        <div className="flex items-center gap-1">
                            {!isServingOrCompleted && (
                                <button onClick={() => setShowSkipModal(true)} className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title={t('queue.skip')}>
                                    <ArrowRightToLine className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {item.status !== 'completed' && !isServingOrCompleted && (
                                <button onClick={() => setShowNoShowModal(true)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title={t('queue.no_show')}>
                                    <UserMinus className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {(s === 'skipped' || s === 'no_show') && (
                                <button onClick={() => onRestore?.(item.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title={t('queue.restore_to_queue')}>
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Primary Action */}
                    <div className="flex-1 min-w-[140px] w-full mt-2 sm:mt-0 ml-auto justify-end">
                        {isPendingPayment ? (
                            <div className="flex flex-col items-end gap-2 w-full animate-in slide-in-from-right-5 duration-300">
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsPaymentMenuOpen(!isPaymentMenuOpen);
                                        }}
                                        className={cn(
                                            "h-10 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all w-full sm:w-auto border",
                                            isPaymentMenuOpen 
                                                ? "bg-white border-slate-200 text-slate-900 shadow-slate-100" 
                                                : "bg-slate-900 border-transparent text-white shadow-slate-200 hover:bg-slate-800"
                                        )}
                                    >
                                        <Wallet className="h-4 w-4" />
                                        {t('queue.mark_paid') || 'Mark Paid'}
                                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isPaymentMenuOpen && "rotate-180")} />
                                    </button>

                                    {isPaymentMenuOpen && (
                                        <div className="absolute bottom-full right-0 mb-3 w-56 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100/50 p-2 z-[100] flex flex-col gap-1 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                                            <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('queue.select_method') || 'Select Method'}</p>
                                            </div>
                                            <button
                                                onClick={() => { onUpdatePayment(item.id, 'cash'); setIsPaymentMenuOpen(false); }}
                                                className="group px-3 py-3 text-left hover:bg-emerald-50 rounded-2xl transition-all flex items-center gap-3"
                                            >
                                                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">💵</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 leading-tight">{t('queue.cash')}</span>
                                                    <span className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-tighter opacity-80">{t('payment.offline')}</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { onUpdatePayment(item.id, 'qr'); setIsPaymentMenuOpen(false); }}
                                                className="group px-3 py-3 text-left hover:bg-blue-50 rounded-2xl transition-all flex items-center gap-3"
                                            >
                                                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📱</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 leading-tight">{t('queue.qr_upi')}</span>
                                                    <span className="text-[9px] font-bold text-blue-600/70 uppercase tracking-tighter opacity-80">{t('payment.digital')}</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <ServiceExecutionStrip
                                services={item.queue_entry_services || []}
                                providers={providers}
                                entryJoinedAt={item.joined_at}
                                now={now}
                                onAssignProvider={onAssignTaskProvider}
                                onStartTask={onStartTask}
                                onCompleteTask={onCompleteTask}
                                onInitialize={onInitializeTasks}
                            />
                        )}
                    </div>

                </div>
            </div>

            {/* No-Show Modal */}
            {showNoShowModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center mb-6 mx-auto">
                            <UserMinus className="h-8 w-8 text-rose-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2 text-center uppercase tracking-tight">{t('queue.customer_missing')}</h3>
                        <p className="text-xs text-slate-500 mb-8 text-center font-bold tracking-tight leading-relaxed px-4">
                            {t('queue.marking')} <b className="capitalize">{item.customer_name || t('queue.guest')}</b> {t('queue.as_no_show')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowNoShowModal(false)} className="h-12 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">{t('queue.cancel')}</button>
                            <button onClick={() => { onNoShow(item.id); setShowNoShowModal(false); }} className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 transition-all active:scale-95">{t('queue.confirm')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skip Modal */}
            {showSkipModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 mx-auto">
                            <ArrowRightToLine className="h-8 w-8 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2 text-center uppercase tracking-tight">{t('queue.skip')}?</h3>
                        <p className="text-xs text-slate-500 mb-8 text-center font-bold tracking-tight leading-relaxed px-4">
                            {t('queue.marking')} <b className="capitalize">{item.customer_name || t('queue.guest')}</b> {t('queue.as_skipped') || "as skipped"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowSkipModal(false)} className="h-12 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">{t('queue.cancel')}</button>
                            <button onClick={() => { onSkip(item.id); setShowSkipModal(false); }} className="h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-200 transition-all active:scale-95">{t('queue.confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
