"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    CalendarDays,
    Phone,
    CheckCheck,
    AlertCircle,
    Play,
    Bell
} from "lucide-react";
import { appointmentService, Appointment } from "@/services/appointmentService";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type AppointmentStatus = Appointment['status'];

export default function AppointmentsPage() {
    const { business } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

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
    }, [fetchAppointments]);

    const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
        setActionLoading(id);
        setMessage(null);
        try {
            await appointmentService.updateStatus(id, status);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
            setMessage({ text: `Appointment ${status} successfully!`, type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ text: err.response?.data?.message || "Failed to update status. Please wait for server update.", type: 'error' });
            setTimeout(() => setMessage(null), 5000);
        } finally {
            setActionLoading(null);
        }
    };

    const handleWhatsAppAction = (apt: Appointment, type: 'alert' | 'call') => {
        const phone = apt.profiles?.phone || apt.guest_phone;
        if (!phone || !business) return;

        const customerName = apt.profiles?.full_name || apt.guest_name || 'Guest';
        const services = (apt as any).appointment_services?.map((as: any) => as.services?.name).filter(Boolean) || [];
        const serviceNames = services.join(', ') || 'General Service';
        const time = new Date(apt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        let message = "";
        if (type === 'alert') {
            message = `Hello ${customerName},\n\nThis is ${business.name}. Your turn for your ${serviceNames} is next! Please be ready. We'll call you shortly.\n\nTime: ${time}\n\nThank you!`;
        } else {
            message = `Hello ${customerName},\n\nThis is ${business.name}. It is now your turn for your ${serviceNames}! Please proceed to the service area.\n\nThank you!`;
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
        return {
            date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600/20" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Loading Concierge...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in duration-1000">
            {/* Header */}
            <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-blue-600 rounded-full" />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reservations</h1>
                </div>
                <p className="text-slate-500 font-medium text-sm">Manage your premium bookings and customer experience.</p>
            </div>

            {/* Notification Bar (Replacement for alert) */}
            {message && (
                <div className={cn(
                    "fixed top-6 right-6 z-[200] px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-500",
                    message.type === 'success' ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                )}>
                    {message.type === 'success' ? <CheckCheck className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="text-xs font-bold uppercase tracking-widest">{message.text}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-[24px] w-fit border border-slate-200/50">
                {(['today', 'upcoming', 'past'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-[18px] transition-all duration-300",
                            activeTab === tab
                                ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 scale-105"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        {tab}
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
                        <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">Quiet Day</p>
                        <p className="text-sm text-slate-400 font-medium">No {activeTab} bookings to display right now.</p>
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
                                    apt.status === 'confirmed' ? "bg-emerald-500" :
                                        apt.status === 'cancelled' ? "bg-red-500" :
                                            apt.status === 'completed' ? "bg-blue-500" : "bg-amber-500"
                                )} />

                                {/* Time/Date Column */}
                                <div className="flex flex-col space-y-1 min-w-[120px]">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{date}</p>
                                    <p className="text-xl font-bold text-slate-900 tracking-tight">{time}</p>
                                    <div className={cn(
                                        "mt-2 inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest w-fit",
                                        apt.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" :
                                            apt.status === 'cancelled' ? "bg-red-50 text-red-600" :
                                                apt.status === 'completed' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        {apt.status}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Customer</p>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                            <span className="capitalize">{apt.profiles?.full_name || 'Premium Guest'}</span>
                                            {apt.profiles?.phone && (
                                                <button
                                                    onClick={() => {
                                                        const profile = apt.profiles;
                                                        if (!profile || !business) return;

                                                        const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                                                        const formatTime12 = (dateString: string) => {
                                                            const d = new Date(dateString);
                                                            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                                        };

                                                        const services = (apt as any).appointment_services?.map((as: any) => as.services?.name).filter(Boolean) || [];
                                                        const serviceNames = services.join(', ') || 'General Service';
                                                        const text = `Hello ${profile.full_name},\n\nYour appointment at ${business.name} has been confirmed.\n\nServices: ${serviceNames}\nDate: ${formatDate(apt.start_time)}\nTime: ${formatTime12(apt.start_time)}\n\nWe look forward to seeing you.\n\nThank you.`;

                                                        let phoneStr = profile.phone.replace(/\D/g, '');
                                                        if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

                                                        window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
                                                    }}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                                    title="Message via WhatsApp"
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </button>
                                            )}
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 max-w-[300px]">
                                            <CalendarDays className="h-4 w-4 text-indigo-600 shrink-0" />
                                            <span className="text-xs font-bold text-slate-700 truncate">
                                                {(apt as any).appointment_services?.map((as: any) => as.services?.name).join(', ') || 'Standard Service'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500">
                                                {(apt as any).appointment_services?.reduce((acc: number, as: any) => acc + (as.services?.duration_minutes || 0), 0) || 30} mins
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 md:border-l md:border-slate-100 md:pl-8">
                                    {(apt.status === 'pending' || apt.status === 'scheduled') && (
                                        <>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                                className="h-14 px-8 bg-slate-900 text-white rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                            >
                                                {actionLoading === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                Confirm
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                                className="h-14 w-14 border-2 border-slate-100 text-red-500 rounded-[20px] hover:bg-red-50 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                                            >
                                                <XCircle className="h-6 w-6" />
                                            </button>
                                        </>
                                    )}

                                    {apt.status === 'confirmed' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'alert')}
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                                title="Send 'Next Turn' Alert"
                                            >
                                                <Bell className="h-4 w-4" />
                                                Alert
                                            </button>
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'call')}
                                                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                                                title="Send 'Your Turn' Call"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Call
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'checked_in')}
                                                className="h-14 px-8 bg-indigo-600 text-white rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
                                            >
                                                <CheckCheck className="h-5 w-5" />
                                                Check In
                                            </button>
                                        </div>
                                    )}

                                    {apt.status === 'checked_in' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'alert')}
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                                title="Send 'Next Turn' Alert"
                                            >
                                                <Bell className="h-4 w-4" />
                                                Alert
                                            </button>
                                            <button
                                                onClick={() => handleWhatsAppAction(apt, 'call')}
                                                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                                                title="Send 'Your Turn' Call"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Call
                                            </button>
                                            <button
                                                disabled={actionLoading === apt.id}
                                                onClick={() => handleUpdateStatus(apt.id, 'in_service')}
                                                className="h-14 px-8 bg-emerald-500 text-white rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-3"
                                            >
                                                <Play className="h-5 w-5" />
                                                Start Service
                                            </button>
                                        </div>
                                    )}

                                    {apt.status === 'in_service' && (
                                        <button
                                            disabled={actionLoading === apt.id}
                                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                            className="h-14 px-8 border-2 border-emerald-500 text-emerald-600 rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            <CheckCheck className="h-5 w-5" />
                                            Complete
                                        </button>
                                    )}

                                    {(apt.status === 'completed' || apt.status === 'cancelled') && (
                                        <div className="px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {apt.status === 'completed' ? 'Finished' : 'Archived'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
