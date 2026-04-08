"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Loader2,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    Share2,
    Info,
    ChevronRight,
    ShieldCheck,
    Wifi,
    MapPin,
    ExternalLink,
    Play,
    Bell,
    Phone,
    QrCode,
    MessageCircle,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { i18n } from "@/lib/i18n";

interface QueueContextItem {
    ticket: string;
    name: string;
    status: string;
    specialist: string;
    service: string;
    is_user: boolean;
}

interface QueueStatus {
    business_name: string;
    business_slug?: string;
    business_phone?: string;
    business_language: string;
    display_token: string;
    current_serving: string;
    current_specialist?: string;
    position: number;
    estimated_wait_time: number;
    status: 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
    guest_name?: string;
    service_names?: string[];
    specialist?: {
        name: string;
        role: string;
    };
    queue_context?: QueueContextItem[];
}

function StatusContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [showDoneToast, setShowDoneToast] = useState(false);

    const urlLang = searchParams.get("lang");
    const lang = urlLang || status?.business_language || 'en';

    const fetchStatus = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/public/queue/status?token=${token}`);
            const result = await res.json();
            if (result.status === 'success') {
                setStatus(result.data);
                setLastUpdated(new Date());
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Connectivity issue detected");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Auto refresh every 30 seconds
        const refreshInterval = setInterval(fetchStatus, 30000);

        const channel = supabase
            .channel('public:queue_entries')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'queue_entries'
                },
                () => {
                    fetchStatus();
                }
            )
            .subscribe();

        return () => {
            clearInterval(refreshInterval);
            supabase.removeChannel(channel);
        };
    }, [token]);

    const handleWhatsApp = () => {
        if (!status?.business_phone) return;
        let phone = status.business_phone.replace(/\D/g, '');
        if (phone.length === 10) phone = `91${phone}`;
        const msgPrefix = i18n.t(lang, 'status.wa_checking_status');
        const message = `${msgPrefix} ${status.display_token} @ ${status.business_name}.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleCall = () => {
        if (!status?.business_phone) return;
        window.open(`tel:${status.business_phone}`, '_self');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
            </div>
        );
    }

    if (error || !status) {
        // Fallback lang if status not loaded
        const lang = status?.business_language || 'en';
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-8">
                <div className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[40px] shadow-2xl">
                    <div className="h-20 w-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{i18n.t(lang, 'status.access_denied')}</h1>
                        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest leading-loose">
                            {error || i18n.t(lang, 'status.invalid_token')}
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
                    >
                        {i18n.t(lang, 'status.try_again')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-0 md:p-6 lg:p-12 font-sans">
            <main className="w-full max-w-lg bg-white min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">

                {/* Dark Navy Header */}
                <div className="bg-[#0f172a] p-10 text-white flex flex-col items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="flex items-center justify-between w-full mb-8 relative z-10">
                        <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-black border-2 border-white/10 shadow-lg">
                            {status.business_name.charAt(0).toUpperCase()}
                        </div>

                        <div className="px-4 py-1.5 bg-[#1e293b] rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-700">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {i18n.t(lang, 'status.live_status_pass')}
                        </div>
                    </div>

                    <div className="text-center space-y-1 relative z-10">
                        <h2 className="text-3xl font-black tracking-tight uppercase">{status.business_name}</h2>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] opacity-80">{i18n.t(lang, 'status.digital_entry_protocol')}</p>
                    </div>
                </div>

                <div className="p-8 pb-12 flex flex-col items-center space-y-8">
                    {/* Main Pass ID Card */}
                    <div className="w-full bg-white border border-slate-100 rounded-[48px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] flex flex-col items-center space-y-10 relative">
                        <QrCode className="absolute top-8 right-8 h-8 w-8 text-slate-100" />

                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">{i18n.t(lang, 'status.pass_id')}</p>
                            <p className="text-8xl font-black text-[#0B1B3F] tracking-tighter">{status.display_token}</p>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-slate-50 rounded-[32px] p-6 text-center space-y-1 border border-slate-100/50">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{i18n.t(lang, 'status.position')}</p>
                                <p className="text-3xl font-black text-[#0B1B3F] tracking-tighter">#{status.position}</p>
                            </div>
                            <div className="bg-slate-50 rounded-[32px] p-6 text-center space-y-1 border border-slate-100/50">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{i18n.t(lang, 'status.wait_time')}</p>
                                <p className="text-3xl font-black text-[#0B1B3F] tracking-tighter">{status.estimated_wait_time}M</p>
                            </div>
                        </div>
                    </div>

                    {/* Serving Section */}
                    <div className="w-full bg-[#0f172a] rounded-[32px] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Users className="h-16 w-16" />
                        </div>
                        <div className="relative z-10 flex flex-col items-center space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">{i18n.t(lang, 'status.currently_serving')}</p>
                            <div className="h-20 w-40 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-center px-4">
                                <p className="text-sm font-bold tracking-tight text-white/60 leading-tight">
                                    {status.current_serving && status.current_serving !== '---' ? status.current_serving : i18n.t(lang, 'status.now_serving_appear')}
                                </p>
                            </div>
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{i18n.t(lang, 'status.sync')} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    {/* Customer Alert Card */}
                    <div className={cn(
                        "w-full p-6 rounded-[32px] border flex flex-col items-center text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500",
                        status.position <= 1
                            ? "bg-blue-50 border-blue-100 shadow-sm"
                            : "bg-slate-50 border-slate-100"
                    )}>
                        {status.position <= 1 ? (
                            <>
                                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center mb-1 shadow-lg shadow-blue-200">
                                    <Bell className="h-5 w-5 text-white animate-bounce" />
                                </div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{i18n.t(lang, 'status.you_are_next')}</h4>
                                <p className="text-[11px] font-bold text-slate-600 leading-relaxed max-w-[240px]">
                                    {i18n.t(lang, 'status.stay_nearby')}
                                </p>
                            </>
                        ) : (
                            <>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{i18n.t(lang, 'status.waiting_turn')}</h4>
                                <p className="text-[11px] font-bold text-slate-600 leading-relaxed max-w-[240px]">
                                    {i18n.t(lang, 'status.notify_approaches')}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full">
                        <button
                            onClick={handleWhatsApp}
                            className="w-full h-16 bg-[#0B1B3F] hover:bg-[#142A5A] text-white rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-900/10"
                        >
                            <MessageCircle className="h-5 w-5 fill-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{i18n.t(lang, 'status.message_official')}</span>
                        </button>
                    </div>

                    {/* Footer Protocol Info */}
                    <div className="pt-4 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-px w-8 bg-slate-200" />
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">{i18n.t(lang, 'status.concierge_protocol')}</p>
                            <div className="h-px w-8 bg-slate-200" />
                        </div>
                        <button
                            onClick={fetchStatus}
                            className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors"
                        >
                            {i18n.t(lang, 'status.force_refresh')}
                        </button>
                        <button
                            onClick={() => {
                                setShowDoneToast(true);
                                setTimeout(() => {
                                    const next = status?.business_slug ? `/p/${status.business_slug}` : "/";
                                    window.location.href = next;
                                }, 1400);
                            }}
                            className="w-full h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all"
                        >
                            {i18n.t(lang, 'public.done') || "Done"}
                        </button>
                    </div>
                </div>
                {showDoneToast && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg">
                        {i18n.t(lang, 'status.thank_you') || "Thank you! We will notify you."}
                    </div>
                )}
            </main >
        </div >
    );
}

// Add these icons to imports: Play, Bell

export default function StatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-200 opacity-20" />
            </div>
        }>
            <StatusContent />
        </Suspense>
    );
}
