"use client";

import { useEffect, useState } from "react";
import { Users, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueService } from "@/services/queueService";
import { businessService } from "@/services/businessService";

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
                    const data = await queueService.getQueueEntries(b.id);
                    setEntries(data);
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
                    const data = await queueService.getQueueEntries(business.id);
                    setEntries(data);
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
        <div className="min-h-screen bg-slate-950 text-white p-12 overflow-hidden flex flex-col gap-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-primary rounded-[32px] flex items-center justify-center text-3xl font-black">
                        {business?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">{business?.name}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em]">Live Traffic Dashboard</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-6xl font-black font-mono">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-slate-500 font-black uppercase tracking-widest mt-2">Current Time</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-12">
                {/* Now Serving */}
                <div className="col-span-12 lg:col-span-7 space-y-8">
                    <div className="flex items-center gap-4 text-emerald-500">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.4em]">In Service</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {serving.length === 0 ? (
                            <div className="bg-slate-900/50 border-4 border-dashed border-slate-800 rounded-[48px] p-24 text-center">
                                <p className="text-3xl font-black text-slate-700 uppercase tracking-widest">Waiting for next customer</p>
                            </div>
                        ) : (
                            serving.map((item) => (
                                <div key={item.id} className="bg-emerald-500 rounded-[48px] p-12 shadow-2xl shadow-emerald-500/20 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <p className="text-white/60 text-xl font-black uppercase tracking-widest">Customer Name</p>
                                        <p className="text-7xl font-black tracking-tighter">{item.customer_name}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-md rounded-[40px] px-12 py-8 text-center min-w-[240px]">
                                        <p className="text-white/60 text-lg font-black uppercase tracking-widest mb-1">Ticket</p>
                                        <p className="text-8xl font-black">#{item.position}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Coming Up Next */}
                <div className="col-span-12 lg:col-span-5 space-y-8">
                    <div className="flex items-center gap-4 text-primary">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <h2 className="text-2xl font-black uppercase tracking-[0.4em]">Up Next</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                        {waiting.length === 0 && serving.length === 0 ? (
                            <div className="bg-slate-900 border-2 border-slate-800 rounded-[32px] p-12 text-center">
                                <p className="text-xl font-black text-slate-600">All Clear!</p>
                            </div>
                        ) : (
                            waiting.map((item, idx) => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between p-8 rounded-[32px] border-2 border-slate-800 transition-all",
                                    idx === 0 ? "bg-slate-800 scale-105 shadow-xl" : "bg-slate-900/50"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl font-black border border-slate-700">
                                            #{item.position}
                                        </div>
                                        <p className="text-3xl font-black">{item.customer_name}</p>
                                    </div>
                                    {idx === 0 && (
                                        <span className="px-4 py-2 bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest">
                                            Next
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-auto p-12 bg-slate-900/30 rounded-[48px] border border-slate-800/50 flex flex-col items-center gap-6 text-center">
                        <div className="h-24 w-24 bg-white rounded-[32px] p-4">
                            {/* Simple placeholder QR or branding */}
                            <div className="h-full w-full bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Users className="h-10 w-10" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-black">Scan to Join Line</p>
                            <p className="text-sm font-bold text-slate-500">{business?.slug}.salonapp.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
