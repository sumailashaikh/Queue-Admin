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
    Megaphone,
    MessageCircle,
    Timer,
    AlertCircle,
    Play
} from "lucide-react";
import { appointmentService, Appointment } from "@/services/appointmentService";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/DashboardUI";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

type AppointmentStatus = Appointment['status'];

export default function AppointmentsPage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
    const [dismissedDelays, setDismissedDelays] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, aptId: null as string | null });
    const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, aptId: null as string | null, dateTime: '' });
    const [search, setSearch] = useState("");

    const isRTL = language === 'ar';
    const tSafe = (key: string, fallback: string, params?: Record<string, any>) => {
        const translated = t(key, params);
        return translated === key ? fallback : translated;
    };

    const getServiceLabel = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value.trim() || null;
        if (typeof value === 'object') {
            const langValue = value[language];
            if (typeof langValue === 'string' && langValue.trim()) return langValue.trim();
            const firstString = Object.values(value).find((v) => typeof v === 'string' && String(v).trim());
            return firstString ? String(firstString).trim() : null;
        }
        return String(value).trim() || null;
    };

    const getTranslatedServiceNames = (apt: Appointment) => {
        if (!apt.appointment_services) return tSafe('appointments.service_fallback', 'Service');

        return apt.appointment_services.map(as => {
            return getServiceLabel(as.services?.translations) || getServiceLabel(as.services?.name);
        }).filter(Boolean).join(', ') || tSafe('appointments.service_fallback', 'Service');
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

    useEffect(() => {
        fetchAppointments();

        const interval = setInterval(() => {
            fetchAppointments();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchAppointments]);

    const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.updateStatus(id, status);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
            const translatedStatus = t(`status.${status}`);
            showSuccess(t('appointments.status_updated', { status: translatedStatus }));
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

    const handleAccept = async (id: string) => {
        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.accept(id);
            showSuccess(t('appointments.success_accept'));
            await fetchAppointments();
        } catch (err: any) {
            showError(err.message || t('common.error_updating'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        setCancelModal({ isOpen: true, aptId: id });
    };

    const handleReschedule = (id: string) => {
        setRescheduleModal({ isOpen: true, aptId: id, dateTime: '' });
    };

    const confirmReschedule = async () => {
        if (!rescheduleModal.aptId || !rescheduleModal.dateTime) return;
        const id = rescheduleModal.aptId;
        const newTime = rescheduleModal.dateTime;
        setRescheduleModal({ isOpen: false, aptId: null, dateTime: '' });

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

    const handleCancel = (id: string) => {
        setCancelModal({ isOpen: true, aptId: id });
    };

    const confirmCancel = async () => {
        if (!cancelModal.aptId) return;
        const id = cancelModal.aptId;
        setCancelModal({ isOpen: false, aptId: null });

        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.reject(id);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
            showSuccess(t('appointments.success_reject'));
        } catch (err: any) {
            showError(err.message || t('appointments.error_reject'));
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

    const handleWhatsAppAction = (apt: Appointment, type: 'alert' | 'call' | 'approve' | 'reschedule') => {
        const phone = apt.profiles?.phone || apt.guest_phone;
        if (!phone || !business) return;

        const customerName = apt.guest_name || apt.profiles?.full_name || tSafe('queue.guest', 'Guest');
        const serviceNames = getTranslatedServiceNames(apt);
        // Fallback to customer language or current language
        const customerLang = (apt as any).profiles?.ui_language || language;
        const time = new Date(apt.start_time).toLocaleTimeString(customerLang === 'hi' ? 'hi-IN' : customerLang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const date = new Date(apt.start_time).toLocaleDateString(customerLang === 'hi' ? 'hi-IN' : customerLang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        let message = "";
        if (type === 'alert') {
            message = t('queue.wa_next_msg', { name: customerName, business: business.name }, customerLang);
        } else if (type === 'call') {
            message = t('queue.wa_ready_msg', { name: customerName, business: business.name }, customerLang);
        } else if (type === 'approve') {
            message = t('queue.wa_approve_msg', { name: customerName, business: business.name, date, time }, customerLang);
        } else if (type === 'reschedule') {
            message = t('queue.wa_reschedule_msg', { name: customerName, business: business.name, date, time }, customerLang);
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
        const customer = (a.profiles?.full_name || a.guest_name || "").toLowerCase();
        const service = getTranslatedServiceNames(a).toLowerCase();
        const q = search.trim().toLowerCase();
        if (q && !customer.includes(q) && !service.includes(q)) return false;
        if (activeTab === 'today') return isToday(a.start_time);
        if (activeTab === 'upcoming') return isUpcoming(a.start_time);
        if (activeTab === 'past') return isPast(a.start_time) || ['completed', 'cancelled', 'expired', 'no_show'].includes(String(a.status || '').toLowerCase());
        return true;
    }).sort((a, b) => {
        const aStatus = String(a.status || "").toLowerCase();
        const bStatus = String(b.status || "").toLowerCase();
        if (aStatus === "pending" && bStatus === "pending") {
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        }
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    const tabCounts = {
        today: appointments.filter(a => isToday(a.start_time)).length,
        upcoming: appointments.filter(a => isUpcoming(a.start_time)).length,
        past: appointments.filter(a => isPast(a.start_time) || ['completed', 'cancelled', 'expired', 'no_show'].includes(String(a.status || '').toLowerCase())).length,
    };
    const confirmedCount = filteredAppointments.filter(a => ["confirmed", "scheduled", "checked_in"].includes(String(a.status || "").toLowerCase())).length;
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
        <div className={cn("space-y-8 max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden px-3 sm:px-4 lg:px-0 pb-20 animate-in fade-in duration-700 font-inter", isRTL && "font-arabic")} dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
                        <Calendar className="h-4 w-4 text-slate-900" />
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t('appointments.management_title')}</span>
                    </div>
                    <div className={cn("space-y-2 text-slate-900", isRTL ? "text-right" : "text-left")}>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                            {t('appointments.subtitle')}
                        </h1>
                        <p className="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
                            {t('appointments.desc')}
                        </p>
                    </div>
                </div>
                <div className="w-full xl:w-auto">
                    <div className="relative w-full xl:w-[320px]">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={tSafe('appointments.search_placeholder', 'Search customer or service')}
                            className={cn(
                                "w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10",
                                isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
                            )}
                        />
                        <User className={cn("h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-3" : "left-3")} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tSafe('appointments.total', 'Total')}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{filteredAppointments.length}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{tSafe('appointments.pending', 'Pending')}</p>
                    <p className="text-2xl font-black text-amber-900 mt-1">{filteredAppointments.filter((a) => String(a.status || "").toLowerCase() === "pending").length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{tSafe('appointments.confirmed', 'Confirmed')}</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{confirmedCount}</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{tSafe('appointments.cancelled', 'Cancelled')}</p>
                    <p className="text-2xl font-black text-rose-900 mt-1">{filteredAppointments.filter((a) => ["cancelled", "expired", "no_show"].includes(String(a.status || "").toLowerCase())).length}</p>
                </div>
            </div>

            {/* Notification Bar (Replacement for alert) */}
            {message && (
                <div className={cn(
                    "fixed top-6 z-200 px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-3 animate-in duration-500",
                    isRTL ? "left-6 slide-in-from-left-10" : "right-6 slide-in-from-right-10",
                    message.type === 'success' ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                )}>
                    {message.type === 'success' ? <CheckCheck className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="text-sm font-semibold uppercase tracking-wider">{message.text}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="w-full overflow-x-auto pb-1">
                <div className="inline-flex min-w-max items-center p-1.5 bg-slate-100/70 backdrop-blur-sm rounded-[20px] border border-slate-200/60">
                    {(['today', 'upcoming', 'past'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 sm:px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                                activeTab === tab
                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105"
                                    : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            {t(`appointments.${tab}`)}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md", activeTab === tab ? "bg-white/20" : "bg-slate-200 text-slate-700")}>
                                {tabCounts[tab]}
                            </span>
                        </button>
                    ))}
                </div>
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
                <div className="grid grid-cols-1 gap-4">
                    {filteredAppointments.map((apt) => {
                        const { date, time } = formatDateTime(apt.start_time);

                        return (
                            <div key={apt.id} className="group relative bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6 overflow-hidden">
                                {/* Side Status Color */}
                                <div className={cn(
                                    "absolute top-0 bottom-0 w-1.5 transition-colors duration-500",
                                    isRTL ? "right-0" : "left-0",
                                    (apt.status === 'confirmed' || apt.status === 'scheduled') ? "bg-emerald-500" :
                                        apt.status === 'cancelled' ? "bg-red-500" :
                                            apt.status === 'completed' ? "bg-blue-500" :
                                                apt.status === 'expired' ? "bg-slate-300" :
                                                    apt.status === 'no_show' ? "bg-rose-600" : "bg-amber-500"
                                )} />

                                {/* Time/Date Column */}
                                <div className={cn("flex flex-col space-y-2 min-w-[130px] shrink-0 border-slate-100", isRTL ? "md:border-l md:pl-6 border-l pr-0" : "md:border-r md:pr-6 border-r")}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-1">{date}</p>

                                    <p className={cn("text-2xl font-black tracking-tighter tabular-nums leading-none", apt.is_delayed ? "text-slate-400 line-through" : "text-slate-900")}>
                                        {time}
                                    </p>

                                    {apt.is_delayed && apt.expected_start_at && (
                                        <div className="flex flex-col mt-1 space-y-0.5 animate-in fade-in zoom-in duration-300">
                                            <span className="text-[10px] font-bold text-amber-500 uppercase">{t('appointments.awaiting_customer_30m')}</span>
                                            <span className="text-lg font-extrabold text-amber-600">{formatDateTime(apt.expected_start_at).time}</span>
                                        </div>
                                    )}

                                    <div className="w-fit">
                                        <StatusBadge status={apt.appointment_state || apt.status} />
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className={cn("flex-1 space-y-3", isRTL ? "text-right" : "text-left")}>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('common.status')}</p>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-3">
                                            <span className="capitalize">{apt.guest_name || apt.profiles?.full_name || t('queue.guest')}</span>

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

                                                        const customerPref = profile.ui_language;
                                                        const locale = (customerPref || language) === 'hi' ? 'hi-IN' : (customerPref || language) === 'ar' ? 'ar-SA' : 'en-GB';
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
                                                        }, customerPref);

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
                                                {(apt as any).appointment_services?.reduce((acc: number, as: any) => acc + (as.services?.duration_minutes || 0), 0) || 30} {tSafe('appointments.minutes_short', 'mins')}
                                            </span>
                                        </div>

                                        {apt.payment_status === 'paid' && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold shadow-sm">
                                                <CheckCheck className="h-3.5 w-3.5" />
                                                <span>{t('status.paid')}</span>
                                            </div>
                                        )}
                                        <div className="text-xs font-bold text-slate-500">
                                            {tSafe('appointments.assigned_to', 'Assigned to')}: {(apt as any)?.employee?.full_name || '--'}
                                        </div>
                                    </div>

                                    {/* Delay Warning Banner */}
                                    {apt.is_delayed && !dismissedDelays.includes(apt.id) && (
                                        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertCircle className="w-5 h-5 shrink-0" />
                                                <span className="text-xs font-bold uppercase leading-tight">{t('appointments.awaiting_customer_30m')}</span>
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
                                <div className={cn("flex items-center gap-2 border-slate-100 flex-wrap", isRTL ? "md:border-r md:pr-6 pr-0 border-none justify-start" : "md:border-l md:pl-6 pl-0 border-none justify-start md:justify-end")}>
                                    {(apt.status === 'pending' || apt.status === 'scheduled' || apt.status === 'requested' || apt.status === 'rescheduled') && (
                                        <>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleAccept(apt.id)}
                                                className="h-10 px-5 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                            >
                                                {actionLoading === apt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {t('appointments.accept')}
                                            </button>
                                            {apt.status === 'rescheduled' ? (
                                                <button
                                                    onClick={() => handleWhatsAppAction(apt, 'reschedule')}
                                                    className="flex items-center justify-center h-10 w-10 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-white transition-all border border-[#25D366]/20 active:scale-95"
                                                    title={t('appointments.whatsapp_reschedule_msg')}
                                                >
                                                    <MessageCircle className="h-4.5 w-4.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleWhatsAppAction(apt, 'approve')}
                                                    className="flex items-center justify-center h-10 w-10 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-white transition-all border border-[#25D366]/20 active:scale-95"
                                                    title={t('appointments.whatsapp_approve')}
                                                >
                                                    <MessageCircle className="h-4.5 w-4.5" />
                                                </button>
                                            )}
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleReschedule(apt.id)}
                                                className="h-10 px-5 border-2 border-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider"
                                                title={t('appointments.reschedule_appointment')}
                                            >
                                                {t('appointments.reschedule')}
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleReject(apt.id)}
                                                className="h-10 px-5 border-2 border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50 text-[11px] font-bold uppercase tracking-wider"
                                                title={t('appointments.reject')}
                                            >
                                                {t('appointments.reject')}
                                            </button>
                                        </>
                                    )}

                                    {(apt.status === 'confirmed' || (apt.status === 'checked_in' && !apt.queue_entry)) && (
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
                                                className="h-10 px-5 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-sm ml-1"
                                            >
                                                <CheckCheck className="h-4 w-4" />
                                                {apt.status === 'checked_in' ? tSafe('appointments.sync_with_queue', 'Sync Queue') : t('appointments.check_in')}
                                            </button>
                                        </div>
                                    )}

                                    {(apt.status === 'in_service' || (apt.status === 'checked_in' && apt.queue_entry)) && (
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

            {/* Modals */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <XCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 mb-2">{tSafe('appointments.confirm_cancel', 'Cancel Appointment?')}</h3>
                        <p className="text-sm text-center font-medium text-slate-500 mb-8">{tSafe('appointments.cancel_desc', 'This action cannot be undone.')}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, aptId: null })} className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors">{tSafe('common.cancel', 'Abort')}</button>
                            <button onClick={confirmCancel} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-colors">
                                {tSafe('common.confirm', 'Yes, Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rescheduleModal.isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center mb-8 mx-auto shadow-inner">
                            <CalendarDays className="h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-center text-slate-900 mb-2 tracking-tight">{t('appointments.reschedule_appointment')}</h3>
                        <p className="text-sm text-center font-medium text-slate-500 mb-10 leading-relaxed px-4">{t('appointments.reschedule_desc')}</p>

                        <div className="space-y-6 mb-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('appointments.prompt_reschedule')}</label>
                                <input
                                    type="datetime-local"
                                    value={rescheduleModal.dateTime}
                                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, dateTime: e.target.value })}
                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setRescheduleModal({ isOpen: false, aptId: null, dateTime: '' })} 
                                className="flex-1 py-5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmReschedule}
                                disabled={!rescheduleModal.dateTime || actionLoading === rescheduleModal.aptId}
                                className="flex-1 py-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === rescheduleModal.aptId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
