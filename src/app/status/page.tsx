"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, Clock, CheckCircle2, AlertCircle, Share2, Info, ArrowRight, ShieldCheck, Wifi, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueStatus {
    business_name: string;
    business_slug?: string;
    display_token: string;
    current_serving: string;
    position: number;
    estimated_wait_time: number;
    status: 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';
}

function StatusContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStatus = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'}/public/queue/status?token=${token}`);
            const result = await res.json();
            if (result.status === 'success') {
                setStatus(result.data);
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
            supabase.removeChannel(channel);
        };
    }, [token]);

    const isNearTurn = status?.position !== undefined && status.position <= 2 && status.status === 'waiting';

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="relative flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-6" />
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Syncing secure connection...</p>
                </div>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-8">
                <div className="max-w-md w-full text-center space-y-10">
                    <div className="h-24 w-24 bg-red-50 rounded-[40px] flex items-center justify-center mx-auto border border-red-100 mb-2">
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Access Denied</h1>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                            {error || "Your secure status token has expired or is invalid for this session."}
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-6 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center p-6 pb-12 font-sans overflow-x-hidden">
            {/* Elegant Header */}
            <header className="w-full max-w-lg mb-10 flex items-center justify-between px-2 pt-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{status.business_name}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm active:scale-95 transition-all text-slate-600 hover:text-indigo-600">
                        <Share2 className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Main Pass Card */}
                <div className="bg-white rounded-[50px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8">
                        <div className={cn(
                            "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm",
                            status.status === 'serving' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                status.status === 'completed' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                    "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                            {status.status}
                        </div>
                    </div>

                    <div className="text-center space-y-2 mt-4 mb-12">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Digital Entry Pass</p>
                        <div className="text-[10rem] font-black tracking-tighter text-slate-900 leading-none drop-shadow-sm select-none">
                            {status.display_token}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-12">
                        <div className="bg-slate-50 rounded-[35px] p-8 text-center border border-slate-100 space-y-2 group transition-all">
                            <Users className="h-6 w-6 text-indigo-500 mx-auto mb-1 opacity-50" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Rank</p>
                            <p className="text-5xl font-black text-slate-900">#{status.position}</p>
                        </div>
                        <div className="bg-slate-50 rounded-[35px] p-8 text-center border border-slate-100 space-y-2 group transition-all">
                            <Clock className="h-6 w-6 text-indigo-500 mx-auto mb-1 opacity-50" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Wait</p>
                            <p className="text-5xl font-black text-slate-900">{status.estimated_wait_time}<span className="text-xl ml-1 text-slate-300">m</span></p>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-slate-50 text-center space-y-8 relative">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Now Calling to Station</p>
                            <div className="relative inline-block w-full">
                                <div className="relative flex flex-col items-center">
                                    <div className={cn(
                                        "w-full px-12 py-10 rounded-[35px] border transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center",
                                        status.current_serving === 'None'
                                            ? "bg-indigo-50/30 border-indigo-100 shadow-sm"
                                            : "bg-slate-900 border-slate-800 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.3)]"
                                    )}>
                                        {/* Board Scanning Effect (Only on active) */}
                                        {status.current_serving !== 'None' && (
                                            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
                                        )}

                                        {status.current_serving === 'None' ? (
                                            <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in duration-1000">
                                                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-indigo-50 mb-2">
                                                    <CheckCircle2 className="h-8 w-8 text-indigo-200" />
                                                </div>
                                                <h3 className="text-xl font-black text-indigo-900/40 uppercase tracking-[0.2em] leading-tight">
                                                    Ready to Welcome<br />Our Next Guest
                                                </h3>
                                            </div>
                                        ) : (
                                            <span className="text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-sm">
                                                {status.current_serving}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sub-label for station status */}
                                    <div className="mt-6 flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-2 w-2 rounded-full", status.current_serving === 'None' ? "bg-slate-300" : "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                                                {status.current_serving === 'None' ? 'Registry Synchronized' : 'Active Session'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 max-w-[220px] mx-auto uppercase tracking-widest leading-relaxed">Please keep your mobile active for the final arrival ping.</p>
                    </div>
                </div>

                {/* Priority Advisory - Tiered Urgency */}
                <div className={cn(
                    "rounded-[40px] p-8 flex items-center gap-6 border transition-all duration-500 relative overflow-hidden",
                    status.position === 1 ? "bg-red-50 border-red-200 text-red-900 animate-pulse" :
                        status.position === 2 ? "bg-amber-50 border-amber-200 text-amber-900" :
                            "bg-white border-slate-100 text-slate-600"
                )}>
                    {status.position === 1 && (
                        <div className="absolute top-0 left-0 h-full w-1.5 bg-red-500" />
                    )}
                    <div className={cn(
                        "h-16 w-16 rounded-[24px] flex items-center justify-center shrink-0 border",
                        status.position === 1 ? "bg-red-100 border-red-200 shadow-sm" :
                            status.position === 2 ? "bg-amber-100 border-amber-200 shadow-sm" :
                                "bg-slate-50 border-slate-100"
                    )}>
                        {status.position === 1 ? <AlertCircle className="h-8 w-8 text-red-600 animate-bounce" /> :
                            status.position === 2 ? <AlertCircle className="h-8 w-8 text-amber-600 animate-pulse" /> :
                                <ShieldCheck className="h-8 w-8 text-indigo-400" />}
                    </div>
                    <div className="space-y-1">
                        <p className={cn("text-[9px] font-black uppercase tracking-widest",
                            status.position === 1 ? "text-red-600" :
                                status.position === 2 ? "text-amber-600" :
                                    "text-indigo-500"
                        )}>
                            {status.position === 1 ? "Immediate Presence Required" :
                                status.position === 2 ? "Priority Alert: Arrive Now" :
                                    "Service Protocol"}
                        </p>
                        <p className="text-sm font-bold leading-snug">
                            {status.position === 1 ? "You are next inline! Please occupy the reception area immediately." :
                                status.position === 2 ? "Your turn is approaching fast. Please arrive at the station now." :
                                    "You will receive a mobile push or WhatsApp when your turn is approaching."
                            }
                        </p>
                    </div>
                </div>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => window.location.href = `/${status.business_name.toLowerCase().replace(/\s+/g, '-')}`} className="bg-white border border-slate-200 rounded-[30px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 group">
                        <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Page</span>
                    </button>
                    <button
                        onClick={() => {
                            if (status?.business_slug) {
                                window.location.href = `/${status.business_slug}`;
                            } else {
                                alert("Business information unavailable.");
                            }
                        }}
                        className="bg-white border border-slate-200 rounded-[30px] p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <ExternalLink className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Our Services</span>
                    </button>
                </div>

                {/* Secure Footer */}
                <footer className="pt-12 text-center space-y-6">
                    <div className="flex items-center justify-center gap-4 opacity-30">
                        <div className="h-px w-8 bg-slate-300" />
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-900">Professional Queue Registry</p>
                        <div className="h-px w-8 bg-slate-300" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">Powered by QueueUp</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center justify-center gap-2">
                            <Wifi className="h-3 w-3" /> Secure Node Sync Active
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
}

export default function StatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400 opacity-20" />
            </div>
        }>
            <StatusContent />
        </Suspense>
    );
}
