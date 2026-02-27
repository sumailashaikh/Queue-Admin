"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    CalendarDays,
    Phone,
    CheckCheck,
    Bell,
    Megaphone,
    Info,
    MessageCircle,
    Timer,
    AlertCircle,
    Play
} from "lucide-react";
import { appointmentService, Appointment } from "@/services/appointmentService";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

type AppointmentStatus = Appointment['status'];

export default function AppointmentsPage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState<any[]>([]); // Added for leave detection
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
    const [dismissedDelays, setDismissedDelays] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const isRTL = language === 'ar';

    const getTranslatedServiceNames = (apt: Appointment) => {
        if (!apt.appointment_services) return 'Service';

        return apt.appointment_services.map(as => {
            if (as.services?.translations && as.services.translations[language]) {
                return as.services.translations[language];
            }
            return as.services?.name;
        }).filter(Boolean).join(', ') || 'Service';
    };

    const fetchAppointments = useCallback(async () => {
        try {
            const data = await appointmentService.getBusinessAppointments();
            setAppointments(data);
        } catch (err) {
            console.error("Failed to fetch appointments:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProviders = useCallback(async () => {
        if (!business?.id) return;
        try {
            const { data } = await api.get(`/service-providers?business_id=${business.id}`) as any;
            setProviders(data || []);
        } catch (err) {
            console.error("Failed to fetch providers:", err);
        }
    }, [business?.id]);

    useEffect(() => {
        fetchAppointments();
        fetchProviders();
    }, [fetchAppointments, fetchProviders]);

    const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.updateStatus(id, status);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
            showSuccess(t('appointments.status_updated', { status: status.toUpperCase() }));
            await fetchAppointments();
        } catch (err: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error("Full Appointment Status Update Error:", err);
            }
            showError(err.message || t('common.error_updating'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdatePayment = async (id: string, method: 'cash' | 'qr' | 'card' | 'unpaid') => {
        setActionLoading(`payment-${id}`);
        try {
            await appointmentService.updatePayment(id, method);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, payment_method: method } : a));
            showSuccess(t('appointments.payment_marked', { method: method.toUpperCase() }));
            await fetchAppointments();
        } catch (err: any) {
            showError(err.message || t('common.error_updating'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReschedule = async (id: string) => {
        const newTime = prompt(t('appointments.prompt_reschedule'));
        if (!newTime) return;

        setActionLoading(id);
        setMessage(null);
        try {
            const isoTime = new Date(newTime).toISOString();
            await appointmentService.reschedule(id, isoTime);
            await fetchAppointments();
            showSuccess(t('appointments.success_reschedule'));
        } catch (err: any) {
            showError(err.message || t('appointments.error_reschedule'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm(t('appointments.confirm_cancel'))) return;

        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.cancel(id);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
            showSuccess(t('appointments.success_cancel'));
        } catch (err: any) {
            showError(err.message || t('appointments.error_cancel'));
        } finally {
            setActionLoading(null);
        }
    };

    const showSuccess = (text: string) => {
        setMessage({ text, type: 'success' });
        setTimeout(() => setMessage(null), 3000);
    };

    const showError = (text: string) => {
        setMessage({ text, type: 'error' });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleWhatsAppAction = (apt: Appointment, type: 'alert' | 'call') => {
        const phone = apt.profiles?.phone || apt.guest_phone;
        if (!phone || !business) return;

        const customerName = apt.profiles?.full_name || apt.guest_name || 'Guest';
        const serviceNames = getTranslatedServiceNames(apt);
        const time = new Date(apt.start_time).toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        let message = "";
        if (type === 'alert') {
            message = t('queue.wa_next_msg', { name: customerName, business: business.name });
        } else {
            message = t('queue.wa_ready_msg', { name: customerName, business: business.name });
        }

        let phoneStr = phone.replace(/\D/g, '');
        if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

        window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const isToday = (dateString: string) => {
        const d = new Date(dateString);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    };

    const isUpcoming = (dateString: string) => {
        const d = new Date(dateString);
        const today = new Date();
        return d > today && d.toDateString() !== today.toDateString();
    };

    const isPast = (dateString: string) => {
        const d = new Date(dateString);
        const today = new Date();
        return d < today && d.toDateString() !== today.toDateString();
    };

    const filteredAppointments = appointments.filter(a => {
        if (activeTab === 'today') return isToday(a.start_time);
        if (activeTab === 'upcoming') return isUpcoming(a.start_time);
        if (activeTab === 'past') return isPast(a.start_time) || a.status === 'completed';
        return true;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const formatDateTime = (dateString: string) => {
        const d = new Date(dateString);
        const locale = language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN';
        return {
            date: d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-inter">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600/20" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('appointments.loading')}</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in duration-1000 font-inter", isRTL && "font-arabic")} dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <Calendar className="h-4 w-4 text-slate-900" />
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('appointments.title')}</span>
                    </div>
                    <div className="space-y-2 text-slate-900 text-left">
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {t('appointments.subtitle')}
                        </h1>
                        <p className="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
                            {t('appointments.desc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Notification Bar (Replacement for alert) */}
            {message && (
                <div className={cn(
                    "fixed top-6 right-6 z-[200] px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-500",
                    message.type === 'success' ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                )}>
                    {message.type === 'success' ? <CheckCheck className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="text-sm font-semibold uppercase tracking-wider">{message.text}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-[24px] w-fit border border-slate-200/50">
                {(['today', 'upcoming', 'past'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300",
                            activeTab === tab
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        {t(`appointments.${tab}`)}
                    </button>
                ))}
            </div>

            {/* List */}
            {filteredAppointments.length === 0 ? (
                <div className="pro-card p-20 flex flex-col items-center justify-center text-center space-y-6 bg-white/50 border-dashed">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{t('appointments.quiet_day')}</p>
                        <p className="text-sm text-slate-400 font-medium">{t('appointments.no_bookings', { tab: t(`appointments.${activeTab}`) })}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredAppointments.map((apt) => {
                        const { date, time } = formatDateTime(apt.start_time);

                        return (
                            <div key={apt.id} className="group relative bg-white border border-slate-100 rounded-[32px] p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col md:flex-row md:items-center gap-8 overflow-hidden">
                                {/* Side Status Color */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500",
                                    (apt.status === 'confirmed' || apt.status === 'scheduled') ? "bg-emerald-500" :
                                        apt.status === 'cancelled' ? "bg-red-500" :
                                            apt.status === 'completed' ? "bg-blue-500" :
                                                apt.status === 'expired' ? "bg-slate-300" :
                                                    apt.status === 'no_show' ? "bg-rose-600" : "bg-amber-500"
                                )} />

                                {/* Time/Date Column */}
                                <div className={cn("flex flex-col space-y-2 min-w-[140px] shrink-0 border-slate-50 pr-8", isRTL ? "md:border-l md:pl-8 border-l" : "md:border-r md:pr-8 border-r")}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-1">{date}</p>

                                    <p className={cn("text-2xl font-black tracking-tighter tabular-nums leading-none", apt.is_delayed ? "text-slate-400 line-through" : "text-slate-900")}>
                                        {time}
                                    </p>

                                    {apt.is_delayed && apt.expected_start_at && (
                                        <div className="flex flex-col mt-1 space-y-0.5 animate-in fade-in zoom-in duration-300">
                                            <span className="text-[10px] font-bold text-amber-500 uppercase">Delayed {apt.delay_minutes} min</span>
                                            <span className="text-lg font-extrabold text-amber-600">{formatDateTime(apt.expected_start_at).time}</span>
                                        </div>
                                    )}

                                    <div className="w-fit">
                                        <StatusBadge status={apt.appointment_state || apt.status} />
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="flex-1 space-y-4 text-left">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('common.status')}</p>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-4">
                                            <span className="capitalize">{apt.profiles?.full_name || apt.guest_name || t('queue.guest')}</span>

                                            {(() => {
                                                const isToday = new Date(apt.start_time).toDateString() === new Date().toDateString();
                                                const isActive = ['scheduled', 'confirmed', 'checked_in', 'in_service'].includes(apt.status);
                                                const hasQueueData = apt.queue_entry && !['completed', 'cancelled', 'no_show', 'skipped'].includes(apt.queue_entry.status);

                                                if (isToday && isActive && hasQueueData) {
                                                    return (
                                                        <StatusBadge status="serving" className="bg-blue-600 text-white shadow-lg shadow-blue-600/20" />
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {apt.profiles?.phone && (
                                                <button
                                                    onClick={() => {
                                                        const profile = apt.profiles;
                                                        if (!profile || !business) return;

                                                        const locale = language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-GB';
                                                        const formatDate = (date: string | Date) => new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
                                                        const formatTime12 = (dateString: string) => {
                                                            const d = new Date(dateString);
                                                            return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
                                                        };

                                                        const text = t('queue.wa_appt_msg', {
                                                            name: profile.full_name,
                                                            business: business.name,
                                                            date: formatDate(apt.start_time),
                                                            time: formatTime12(apt.start_time)
                                                        });

                                                        let phoneStr = profile.phone.replace(/\D/g, '');
                                                        if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

                                                        window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
                                                    }}
                                                    className="p-2.5 bg-[#25D366]/10 text-[#25D366] rounded-2xl hover:bg-[#25D366] hover:text-white transition-all shadow-sm border border-[#25D366]/20"
                                                    title={t('appointments.whatsapp_customer')}
                                                >
                                                    <MessageCircle className="h-4.5 w-4.5" />
                                                </button>
                                            )}
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 max-w-[300px]">
                                            <CalendarDays className="h-4 w-4 text-indigo-600 shrink-0" />
                                            <span className="text-xs font-bold text-slate-700 truncate">
                                                {getTranslatedServiceNames(apt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500">
                                                {(apt as any).appointment_services?.reduce((acc: number, as: any) => acc + (as.services?.duration_minutes || 0), 0) || 30} mins
                                            </span>
                                        </div>

                                        {/* Payment UI */}
                                        {apt.payment_status === 'paid' ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold shadow-sm">
                                                <CheckCheck className="h-3.5 w-3.5" />
                                                <span className="capitalize">{apt.payment_method}</span> {t('status.paid')}
                                            </div>
                                        ) : (
                                            /* Hide payment buttons if checked in or in service */
                                            (apt.status !== 'checked_in' && apt.status !== 'in_service') ? (
                                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                    <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">{t('appointments.pay')}:</span>
                                                    <button onClick={() => handleUpdatePayment(apt.id, 'cash')} className="px-3 py-1.5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold border shadow-sm transition-all flex items-center gap-1.5">
                                                        Cash
                                                    </button>
                                                    <button onClick={() => handleUpdatePayment(apt.id, 'qr')} className="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold border shadow-sm transition-all flex items-center gap-1.5">
                                                        QR
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold shadow-sm uppercase">
                                                    {t('appointments.payment_in_queue')}
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Delay Warning Banner */}
                                    {apt.is_delayed && !dismissedDelays.includes(apt.id) && (
                                        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertCircle className="w-5 h-5 shrink-0" />
                                                <span className="text-xs font-bold uppercase leading-tight">{t('appointments.running_late', { min: apt.delay_minutes })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button onClick={() => setDismissedDelays(p => [...p, apt.id])} className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-100/50 text-amber-700 hover:bg-amber-100 text-xs font-bold rounded-lg transition-colors border border-amber-200/50">
                                                    {t('appointments.keep_as_is')}
                                                </button>
                                                <button onClick={() => handleReschedule(apt.id)} className="flex-1 sm:flex-none px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg transition-colors shadow-sm">
                                                    {t('appointments.reschedule')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className={cn("flex items-center gap-2 border-slate-100", isRTL ? "md:border-r md:pr-6 pr-0 border-none" : "md:border-l md:pl-6 pl-0 border-none")}>
                                    {(apt.status === 'pending' || apt.status === 'scheduled' || apt.status === 'requested' || apt.status === 'rescheduled') && (
                                        <>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                                className="h-10 px-6 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                            >
                                                {actionLoading === apt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {t('common.confirm')}
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleReschedule(apt.id)}
                                                className="h-10 w-10 border-2 border-slate-100 text-indigo-500 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                                                title={t('appointments.reschedule_appointment')}
                                            >
                                                <CalendarDays className="h-5 w-5" />
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleCancel(apt.id)}
                                                className="h-10 w-10 border-2 border-slate-100 text-red-500 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                                                title={t('appointments.cancel_appointment')}
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}

                                    {apt.status === 'confirmed' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'alert')}
                                                className="flex items-center justify-center h-10 w-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 active:scale-90"
                                                title={t('appointments.whatsapp_next')}
                                            >
                                                <Megaphone className="h-4.5 w-4.5" />
                                            </button>
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'call')}
                                                className="flex items-center justify-center h-10 w-10 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-white transition-all border border-[#25D366]/20 active:scale-90"
                                                title={t('appointments.whatsapp_ready')}
                                            >
                                                <MessageCircle className="h-4.5 w-4.5" />
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'checked_in')}
                                                className="h-10 px-6 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                                            >
                                                <CheckCheck className="h-4 w-4" />
                                                {t('appointments.check_in')}
                                            </button>
                                        </div>
                                    )}

                                    {(apt.status === 'checked_in' || apt.status === 'in_service') && (
                                        <div className="flex items-center gap-2">
                                            <div className="px-6 py-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                {t('appointments.active_in_queue')}
                                            </div>
                                        </div>
                                    )}

                                    {(apt.status === 'completed' || apt.status === 'cancelled') && (
                                        <div className="px-5 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-wider border border-slate-100">
                                            {apt.status === 'completed' ? t('common.finished') : t('common.archived')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }
        </div >
    );
}
