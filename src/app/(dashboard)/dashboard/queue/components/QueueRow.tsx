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
    Wallet
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
    onShowToast: (message: string, type?: 'success' | 'error') => void;
}

// Local components replaced by shared StatusBadge

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
    onShowToast
}) => {
    const { t } = useLanguage();
    const [now, setNow] = useState(Date.now());
    const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
    const [showNoShowModal, setShowNoShowModal] = useState(false);

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

    const isServingOrCompleted = ['serving', 'completed', 'done', 'skipped', 'no_show'].includes(item.status);
    const isPendingPayment = item.status === 'completed' && (item.payment_method === 'unpaid' || !item.payment_method);

    return (
        <div className={cn(
            "group relative bg-white rounded-[32px] border border-slate-100 mb-4 p-6 shadow-sm transition-all duration-300 hover:shadow-md flex items-center gap-6",
            item.status === 'no_show' && "opacity-75 grayscale-[0.3]"
        )}>
            {/* Side Status Indicator */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 rounded-l-[32px]",
                item.status === 'serving' ? "bg-blue-600" :
                    item.status === 'waiting' ? "bg-amber-500" :
                        item.status === 'completed' ? "bg-emerald-500" :
                            item.status === 'no_show' ? "bg-rose-600" : "bg-slate-300"
            )} />
            {/* POSITION & AVATAR */}
            <div className="flex items-center gap-4 w-32 shrink-0">
                <div className="h-10 w-10 flex items-center justify-center bg-indigo-50/50 text-indigo-600 font-black rounded-full text-[10px] border border-indigo-100/50 shadow-inner">
                    #{item.position}
                </div>
                <div className="relative">
                    <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        <Users className="h-7 w-7 text-slate-400" />
                    </div>
                    {item.status === 'serving' && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                            <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOMER & CONTACT */}
            <div className="w-52 shrink-0 space-y-1">
                <h3 className="text-lg font-black text-slate-900 truncate tracking-tight capitalize">{item.customer_name || t('queue.guest')}</h3>
                <p className="text-xs font-bold text-slate-500 tabular-nums">{item.phone || t('queue.no_phone')}</p>
                <div className="flex items-center gap-1 opacity-60">
                    <QrCode className="h-3 w-3 text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                        {t('queue.ref')}: {item.id.slice(-6).toUpperCase()}
                    </span>
                </div>
            </div>

            {/* SERVICE & STATUS MAIN */}
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                    <h4 className="text-base font-black text-slate-900 tracking-tight">
                        {item.queue_entry_services?.[0]?.services?.name || 'Service'}
                    </h4>
                    <div className="flex items-center gap-1.5">
                        <StatusBadge status={item.payment_method === 'unpaid' || !item.payment_method ? 'unpaid' : 'paid'} />
                        <StatusBadge status={item.status} />
                        {isDelayed && item.status === 'waiting' && (
                            <div className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {t('queue.late')} {delayMins}{t('queue.min')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">{t('queue.timing')}</span>
                        <p className="text-xs font-black text-slate-700 tabular-nums">
                            {joinedTime} <span className="mx-1 text-slate-200">|</span>
                            <span className={startedTime ? "text-blue-600" : "text-slate-500"}>
                                {startedTime ? `${t('queue.started')} ${startedTime}` : `${t('queue.exp')} ${expectedTime}`}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">{t('queue.status')}</span>
                        <p className={cn(
                            "text-xs font-black uppercase tracking-tight",
                            item.status === 'serving' ? "text-emerald-600" : "text-amber-600"
                        )}>
                            {item.status === 'serving' ? t('queue.in_service') : t('queue.waiting')}
                        </p>
                    </div>
                </div>
            </div>

            {/* ACTIONS SECTION */}
            <div className="flex items-center gap-4 shrink-0 pl-6 border-l border-slate-50">
                {/* Secondary Actions (Icons) */}
                {item.status !== 'completed' && item.status !== 'no_show' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!item.phone || !business) { onShowToast(t('queue.no_phone'), "error"); return; }
                                const cleanPhone = item.phone.replace(/\D/g, '');
                                const name = item.customer_name || t('queue.guest');
                                const message = encodeURIComponent(t('queue.wa_delay_msg', { name, business: business.name }));
                                window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                                sessionStorage.setItem(delayKey, 'true');
                                setHasNotifiedDelay(true);
                            }}
                            className={cn(
                                "h-10 w-10 flex items-center justify-center rounded-full transition-all active:scale-90",
                                isDelayed && !hasNotifiedDelay ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10"
                            )}
                            title={t('queue.whatsapp_delay_alert')}
                        >
                            <Timer className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (!item.phone || !business) { onShowToast(t('queue.no_phone'), "error"); return; }
                                const cleanPhone = item.phone.replace(/\D/g, '');
                                const name = item.customer_name || t('queue.guest');
                                const message = encodeURIComponent(t('queue.wa_next_msg', { name, business: business.name }));
                                window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all active:scale-90"
                            title={t('queue.whatsapp_youre_next')}
                        >
                            <Megaphone className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (!item.phone || !business) return;
                                const cleanPhone = item.phone.replace(/\D/g, '');
                                const name = item.customer_name || t('queue.guest');
                                const message = encodeURIComponent(t('queue.wa_ready_msg', { name, business: business.name }));
                                window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all active:scale-90 border border-[#25D366]/20"
                            title={t('queue.whatsapp_turn_ready')}
                        >
                            <MessageCircle className="h-5 w-5 fill-current opacity-20" />
                        </button>
                    </div>
                )}

                {/* Primary Action Button Area */}
                <div className="min-w-[140px] flex flex-col gap-2">
                    {isPendingPayment ? (
                        <div className="relative">
                            <button
                                onClick={() => setIsPaymentMenuOpen(!isPaymentMenuOpen)}
                                className="w-full h-10 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200"
                            >
                                {t('queue.mark_paid')}
                            </button>
                            {isPaymentMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] flex flex-col gap-1">
                                    <button onClick={() => { onUpdatePayment(item.id, 'cash'); setIsPaymentMenuOpen(false); }} className="px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 rounded-xl text-slate-700">{t('queue.cash')}</button>
                                    <button onClick={() => { onUpdatePayment(item.id, 'qr'); setIsPaymentMenuOpen(false); }} className="px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 rounded-xl text-slate-700">{t('queue.qr_upi')}</button>
                                </div>
                            )}
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
                        />
                    )}
                </div>

                {/* More / Overflow */}
                <div className="flex flex-col gap-1">
                    {!isServingOrCompleted && (
                        <button onClick={() => onSkip?.(item.id)} className="p-2 text-slate-200 hover:text-amber-500 transition-colors">
                            <ArrowRightToLine className="h-4 w-4" />
                        </button>
                    )}
                    {!isServingOrCompleted && (
                        <button onClick={() => setShowNoShowModal(true)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                            <UserMinus className="h-4 w-4" />
                        </button>
                    )}
                    {(item.status === 'skipped' || item.status === 'no_show') && (
                        <button onClick={() => onRestore?.(item.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title={t('queue.restore_to_queue')}>
                            <RefreshCcw className="h-4 w-4" />
                        </button>
                    )}
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
                            <button
                                onClick={() => setShowNoShowModal(false)}
                                className="h-12 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {t('queue.cancel')}
                            </button>
                            <button
                                onClick={() => { onNoShow(item.id); setShowNoShowModal(false); }}
                                className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 transition-all active:scale-95"
                            >
                                {t('queue.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
