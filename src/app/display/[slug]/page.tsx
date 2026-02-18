"use client";

import { useEffect, useState, use } from "react";
import { Users, Clock, Loader2, Monitor, Play, Wifi, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/businessService";
import { QRCodeSVG } from "qrcode.react";

export default function PublicTVDisplayPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const res = await businessService.getBusinessDisplayData(slug);
                setBusiness(res.business);
                setEntries(res.entries);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        const interval = setInterval(async () => {
            if (slug) {
                try {
                    const res = await businessService.getBusinessDisplayData(slug);
                    setEntries(res.entries);
                } catch (err) {
                    console.error("Poll failed", err);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">Initialising High-End Display</p>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 text-center">
                <div className="space-y-6 bg-white p-12 rounded-[48px] shadow-2xl border border-slate-100">
                    <Monitor className="h-20 w-20 text-red-500 mx-auto" />
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">System Offline</h1>
                    <p className="text-slate-500 font-medium">Please verify the business link or contact support.</p>
                </div>
            </div>
        );
    }

    const servingEntries = entries.filter(e => e.status === 'serving').slice(0, 3);
    const waitingEntries = entries.filter(e => e.status === 'waiting' || e.status === 'checked_in');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-12 flex flex-col gap-12 overflow-hidden">
            {/* Premium Header Area */}
            <div className="flex items-center justify-between bg-white px-12 py-10 rounded-[48px] shadow-xl border border-white/50">
                <div className="space-y-1">
                    <h1 className="text-6xl font-black tracking-tight text-slate-900 uppercase italic leading-none">{business.name}</h1>
                    <div className="flex items-center gap-4 text-indigo-600 font-black text-xl">
                        <Monitor className="h-6 w-6" />
                        <span className="uppercase tracking-[0.3em]">Digital Display Mode</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-8xl font-black tracking-tighter tabular-nums text-slate-900 leading-none">
                        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <p className="text-xl font-black text-slate-400 uppercase tracking-widest mt-4">
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-12 flex-1 min-h-0">
                {/* Left: Now Serving (High Clarity) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
                    <div className="flex items-center gap-4 px-6">
                        <div className="h-14 w-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <Play className="h-8 w-8 fill-current" />
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-widest text-slate-900">Now Serving</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8 flex-1">
                        {servingEntries.length > 0 ? (
                            servingEntries.map((item, idx) => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between p-12 rounded-[56px] border-4 transition-all duration-700",
                                    idx === 0
                                        ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_20px_80px_rgba(16,185,129,0.25)] scale-[1.02]"
                                        : "bg-white border-slate-100 text-slate-900 shadow-xl"
                                )}>
                                    <div className="space-y-4">
                                        <p className={cn("text-3xl font-black uppercase tracking-[0.2em]", idx === 0 ? "text-white/70" : "text-slate-400")}>
                                            {item.service_name || "Standard Service"}
                                        </p>
                                        <p className="text-8xl font-black tracking-tighter capitalize">{item.customer_name}</p>
                                    </div>
                                    <div className={cn(
                                        "h-48 w-64 rounded-[40px] flex items-center justify-center text-8xl font-black shadow-2xl",
                                        idx === 0 ? "bg-white text-emerald-500" : "bg-emerald-500 text-white"
                                    )}>
                                        {item.display_token}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 rounded-[56px] bg-white border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12 shadow-inner">
                                <Clock className="h-32 w-32 text-slate-100 mb-8" />
                                <p className="text-4xl font-black text-slate-200 uppercase tracking-widest">Awaiting Next Customer</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Waitlist & Interactions */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-10 bg-white rounded-[56px] border border-slate-100 p-12 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                        <div className="flex items-center gap-4">
                            <Users className="h-10 w-10 text-indigo-600" />
                            <h2 className="text-3xl font-black uppercase tracking-widest text-slate-900">Waitlist</h2>
                        </div>
                        <div className="px-8 py-3 bg-indigo-50 text-indigo-600 rounded-full text-2xl font-black border border-indigo-100/50">
                            {waitingEntries.length} IN LINE
                        </div>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
                        {waitingEntries.slice(0, 8).map((item) => (
                            <div key={item.id} className="flex items-center justify-between px-10 py-8 bg-slate-50/50 rounded-[32px] border border-slate-100 hover:border-indigo-200 transition-all hover:bg-indigo-50/20 group">
                                <div className="space-y-1">
                                    <p className="text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors capitalize">{item.customer_name}</p>
                                    <p className="text-lg font-black text-slate-400 uppercase tracking-[0.1em]">{item.service_name}</p>
                                </div>
                                <div className="h-20 w-32 bg-white rounded-[24px] border border-slate-100 flex items-center justify-center text-4xl font-black text-slate-900 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all">
                                    {item.display_token}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Highly Visible QR Engagement */}
                    <div className="mt-8 p-12 bg-indigo-600 rounded-[48px] flex items-center gap-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className="h-40 w-40 bg-white p-6 rounded-[32px] shadow-2xl relative z-10 flex-shrink-0 animate-in fade-in zoom-in duration-1000">
                            {typeof window !== 'undefined' && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/${slug}`}
                                    size={112}
                                    level="H"
                                />
                            )}
                        </div>
                        <div className="space-y-3 relative z-10">
                            <h3 className="text-5xl font-black tracking-tighter leading-none">JOIN THE LINE</h3>
                            <p className="text-xl font-bold opacity-80 leading-tight uppercase tracking-wide">Scan to secure your turn instantly</p>
                            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-white/20 rounded-full w-fit">
                                <Wifi className="h-4 w-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Digital intake active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Scrolling Ticker */}
            <div className="flex items-center gap-12 bg-white py-6 px-12 rounded-full shadow-lg border border-slate-100">
                <div className="flex items-center gap-4 text-indigo-600 flex-shrink-0">
                    <div className="h-4 w-4 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
                    <span className="font-black uppercase tracking-widest text-xl italic">Live Stream</span>
                </div>
                <div className="h-10 w-[2px] bg-slate-100" />
                <div className="flex-1 overflow-hidden whitespace-nowrap">
                    <div className="inline-block animate-marquee text-xl font-black text-slate-400 uppercase tracking-[0.2em]">
                        Welcome to {business.name}! • Professional service experience guaranteed • Scan the QR code to join the line instantly • Approximate wait time is currently under {(waitingEntries.length * 10)} minutes • Thank you for choosing us! •
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                    display: inline-block;
                    padding-right: 100%;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
