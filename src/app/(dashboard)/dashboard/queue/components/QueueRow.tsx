"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { QueueEntry } from "@/services/queueService";
import {
    Calendar,
    Bell,
    Phone,
    Clock,
    SkipForward,
    QrCode,
    RefreshCcw,
    RotateCcw,
    Play,
    Globe,
    CheckCheck,
    ChevronDown,
    Users,
    UserX
} from "lucide-react";
import { ServiceExecutionStrip } from "./ServiceExecutionStrip";

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

// Status Badge Components
const ServiceStatusBadge = ({ status }: { status: string }) => {
    const config = {
        waiting: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'WAITING' },
        serving: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'IN SERVICE' },
        completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'COMPLETED' },
        no_show: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'NO SHOW' },
        skipped: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'SKIPPED' }
    }[status] || { bg: 'bg-slate-100', text: 'text-slate-500', label: status.toUpperCase() };

    return (
        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/5 whitespace-nowrap", config.bg, config.text)}>
            {config.label}
        </div>
    );
};

const PaymentStatusBadge = ({ method }: { method: string }) => {
    const isUnpaid = method === 'unpaid' || !method;

    if (isUnpaid) {
        return (
            <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                UNPAID
            </div>
        );
    }

    return (
        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
            PAID
        </div>
    );
};

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
            "group bg-white rounded-[32px] border border-slate-100 mb-4 p-6 shadow-sm transition-all duration-300 hover:shadow-md flex items-center gap-6",
            item.status === 'no_show' && "opacity-75 grayscale-[0.3]"
        )}>
            {/* POSITION & AVATAR */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="h-10 w-10 flex items-center justify-center bg-slate-50 text-slate-400 font-black rounded-full text-sm">
                    {item.position}
                </div>
                <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    {item.status === 'serving' && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                            <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOMER & CONTACT */}
            <div className="w-[180px] shrink-0 space-y-1">
                <h3 className="text-lg font-black text-slate-900 truncate tracking-tight capitalize">{item.customer_name || 'Guest'}</h3>
                <p className="text-xs font-bold text-slate-400">+91 {item.phone ? item.phone.slice(-10) : 'XXXXXXXXXX'}</p>
                <div className="flex items-center gap-1 opacity-50">
                    <QrCode className="h-3 w-3 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        ENTRY_#{item.id.slice(-4).toUpperCase()}
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
                        <PaymentStatusBadge method={item.payment_method || ''} />
                        <ServiceStatusBadge status={item.status} />
                        {isDelayed && item.status === 'waiting' && (
                            <div className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                late {delayMins}m
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Timing</span>
                        <p className="text-xs font-bold text-slate-500">
                            {joinedTime} <span className="mx-1 text-slate-200">|</span>
                            <span className={startedTime ? "text-indigo-600" : ""}>
                                {startedTime ? `Started ${startedTime}` : `Exp. ${expectedTime}`}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Status</span>
                        <p className={cn(
                            "text-xs font-black uppercase tracking-tight",
                            item.status === 'serving' ? "text-emerald-500" : "text-amber-500"
                        )}>
                            {item.status === 'serving' ? "RUNNING" : "WAITING"}
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
                                if (!item.phone) { onShowToast("No phone", "error"); return; }
                                const cleanPhone = item.phone.replace(/\D/g, '');
                                const message = encodeURIComponent(`Hi ${item.customer_name || 'Guest'}, your visit is expected at ${expectedTime}. Thank you for your patience.`);
                                window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                                sessionStorage.setItem(delayKey, 'true');
                                setHasNotifiedDelay(true);
                            }}
                            className={cn(
                                "h-10 w-10 flex items-center justify-center rounded-full transition-all active:scale-90",
                                isDelayed && !hasNotifiedDelay ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            )}
                            title="Update Delay"
                        >
                            <Clock className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (!item.phone) { onShowToast("No phone", "error"); return; }
                                const cleanPhone = item.phone.replace(/\D/g, '');
                                const message = encodeURIComponent(`Hi ${item.customer_name || 'Guest'}, your turn is next. Please be ready.`);
                                window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                            title="Next Up Alert"
                        >
                            <Bell className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (!item.phone) return;
                                window.location.href = `tel:${item.phone}`;
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                            title="Call Customer"
                        >
                            <Phone className="h-5 w-5" />
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
                                Mark Paid
                            </button>
                            {isPaymentMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] flex flex-col gap-1">
                                    <button onClick={() => { onUpdatePayment(item.id, 'cash'); setIsPaymentMenuOpen(false); }} className="px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 rounded-xl text-slate-700">Cash</button>
                                    <button onClick={() => { onUpdatePayment(item.id, 'qr'); setIsPaymentMenuOpen(false); }} className="px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 rounded-xl text-slate-700">QR / UPI</button>
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
                            <SkipForward className="h-4 w-4" />
                        </button>
                    )}
                    {!isServingOrCompleted && (
                        <button onClick={() => setShowNoShowModal(true)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                            <UserX className="h-4 w-4" />
                        </button>
                    )}
                    {(item.status === 'skipped' || item.status === 'no_show') && (
                        <button onClick={() => onRestore?.(item.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Restore to Queue">
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
                            <UserX className="h-8 w-8 text-rose-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-2 text-center uppercase tracking-tight">Customer Missing?</h3>
                        <p className="text-xs text-slate-500 mb-8 text-center font-bold tracking-tight leading-relaxed px-4">
                            Marking <b className="capitalize">{item.customer_name || 'this guest'}</b> as a No-Show will release their position.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowNoShowModal(false)}
                                className="h-12 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onNoShow(item.id); setShowNoShowModal(false); }}
                                className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 transition-all active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
