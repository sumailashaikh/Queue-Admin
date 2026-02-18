"use client";

import { useEffect, useState } from "react";
import { Users, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueService } from "@/services/queueService";
import { businessService } from "@/services/businessService";
import { QRCodeSVG } from "qrcode.react";

export default function TVDisplayPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const b = await businessService.getMyBusiness();
                setBusiness(b);
                if (b) {
                    const queues = await queueService.getMyQueues();
                    if (queues.length > 0) {
                        const data = await queueService.getQueueEntriesToday(queues[0].id);
                        setEntries(data);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // High-frequency polling for TV display (every 5 seconds)
        const interval = setInterval(async () => {
            if (business) {
                try {
                    const queues = await queueService.getMyQueues();
                    if (queues.length > 0) {
                        const data = await queueService.getQueueEntriesToday(queues[0].id);
                        setEntries(data);
                    }
                } catch (err) {
                    console.error("Poll failed", err);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [business?.id]);

    const serving = entries.filter(e => e.status === 'serving');
    const waiting = entries.filter(e => e.status === 'waiting').slice(0, 5);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 md:p-12 overflow-hidden flex flex-col gap-8 md:gap-12 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-900/40 p-8 rounded-[40px] border border-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-8">
                    <div className="h-24 w-24 bg-primary rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl shadow-primary/20 transform -rotate-3">
                        {business?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black tracking-tight text-white">{business?.name}</h1>
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Live Serving Dashboard</p>
                        </div>
                    </div>
                </div>
                <div className="text-right bg-slate-950/50 px-10 py-6 rounded-[32px] border border-slate-800 shadow-inner">
                    <p className="text-7xl font-black font-mono tracking-tighter text-primary leading-none">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-3">Current Time</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-8 md:gap-12 h-full">
                {/* Now Serving */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <div className="flex items-center gap-4 text-emerald-400 ml-2">
                        <Users className="h-6 w-6" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.5em]">Now Serving</h2>
                    </div>

                    <div className="h-full">
                        {serving.length === 0 ? (
                            <div className="bg-slate-900/30 border-4 border-dashed border-slate-800 rounded-[60px] h-[400px] flex flex-col items-center justify-center gap-6 group transition-all">
                                <div className="h-24 w-24 bg-slate-800/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Clock className="h-10 w-10 text-slate-600" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-4xl font-black text-slate-700 uppercase tracking-widest leading-tight">Waiting for<br />Next Customer</p>
                                    <p className="text-slate-800 font-black uppercase tracking-[0.3em] text-xs">All caught up!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                {serving.map((item) => (
                                    <div key={item.id} className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[60px] p-16 shadow-2xl shadow-emerald-500/20 flex items-center justify-between relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                                            <Users className="h-64 w-64" />
                                        </div>
                                        <div className="space-y-4 relative z-10">
                                            <p className="text-white/70 text-2xl font-black uppercase tracking-[0.2em] mb-2">Currently Serving</p>
                                            <p className="text-9xl font-black tracking-tighter text-white drop-shadow-2xl">{item.customer_name}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-black uppercase tracking-widest text-white border border-white/20">
                                                    {item.service_name || 'Service In Progress'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[48px] px-16 py-12 text-center min-w-[300px] shadow-2xl relative z-10 transform -rotate-2 group-hover:rotate-0 transition-transform">
                                            <p className="text-slate-400 text-xl font-black uppercase tracking-widest mb-2">Token #</p>
                                            <p className="text-9xl font-black text-primary leading-none tracking-tighter">{item.ticket_number}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Coming Up Next */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 h-full">
                    <div className="flex items-center gap-4 text-primary ml-2">
                        <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.5em]">Up Next</h2>
                    </div>

                    <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        {waiting.length === 0 ? (
                            <div className="bg-slate-900/50 border-2 border-slate-800 rounded-[40px] p-12 text-center">
                                <p className="text-xl font-black text-slate-600 uppercase tracking-widest">Queue Empty</p>
                            </div>
                        ) : (
                            waiting.map((item, idx) => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between p-8 rounded-[40px] border-2 transition-all duration-500",
                                    idx === 0
                                        ? "bg-primary border-primary text-white scale-105 shadow-2xl shadow-primary/30"
                                        : "bg-slate-900 border-slate-800 text-slate-400"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black border",
                                            idx === 0 ? "bg-white/20 border-white/20 text-white" : "bg-slate-800 border-slate-700 text-slate-500"
                                        )}>
                                            {item.ticket_number}
                                        </div>
                                        <p className={cn(
                                            "text-3xl font-black tracking-tight",
                                            idx === 0 ? "text-white" : "text-slate-300"
                                        )}>{item.customer_name}</p>
                                    </div>
                                    {idx === 0 && (
                                        <div className="px-5 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                                            Next
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-auto p-12 bg-white rounded-[60px] shadow-2xl flex flex-col items-center gap-8 text-center border-[12px] border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-primary/10" />
                        <div className="relative z-10 bg-slate-50 p-6 rounded-[40px] border-2 border-slate-100 group-hover:scale-105 transition-transform duration-500">
                            {business && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/${business.slug}`}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            )}
                        </div>
                        <div className="space-y-2 relative z-10">
                            <p className="text-3xl font-black text-slate-900 tracking-tight">Scan to Join</p>
                            <p className="text-sm font-black text-primary uppercase tracking-[0.3em]">{business?.slug}.salonapp.com</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
