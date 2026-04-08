"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import { Users, Clock, Loader2, Monitor, Play, Wifi, Bell } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { businessService } from "@/services/businessService";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/context/LanguageContext";

export default function PublicTVDisplayPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { language, setLanguage, t } = useLanguage();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [origin, setOrigin] = useState("");

    const isRTL = language === 'ar';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") setOrigin(window.location.origin);
    }, []);

    const fetchDisplayData = useCallback(async () => {
        try {
            const res = await businessService.getBusinessDisplayData(slug);
            setBusiness(res.business);
            setEntries(Array.isArray(res.entries) ? res.entries.filter(Boolean) : []);
            setError(null);

            // Auto-set language to business language if defined (do not persist locally to user)
            if (res.business?.language && res.business.language !== language) {
                setLanguage(res.business.language, false);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [slug, language, setLanguage]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchDisplayData();
            } catch {
                // No-op: errors handled in fetchDisplayData
            }
        };

        loadInitialData();

        const interval = setInterval(async () => {
            if (slug) {
                try {
                    await fetchDisplayData();
                } catch (err) {
                    console.error("Poll failed", err);
                }
            }
        }, 3000);

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchDisplayData();
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [slug, fetchDisplayData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">{t('common.loading')}</p>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 text-center text-slate-900">
                <div className="space-y-6 bg-white p-12 rounded-[48px] shadow-2xl border border-slate-100">
                    <Monitor className="h-20 w-20 text-red-500 mx-auto" />
                    <h1 className="text-4xl font-black uppercase tracking-tighter">System Offline</h1>
                    <p className="text-slate-500 font-medium">Please verify the business link or contact support.</p>
                </div>
            </div>
        );
    }

    const safeEntries = useMemo(() => (Array.isArray(entries) ? entries.filter(Boolean) : []), [entries]);
    const servingEntries = useMemo(() => safeEntries.filter(e => e.status === 'serving').slice(0, 6), [safeEntries]);
    const waitingEntries = useMemo(() => safeEntries.filter(e => e.status === 'waiting' || e.status === 'checked_in'), [safeEntries]);
    const nextEntries = waitingEntries.slice(0, 3);
    const waitingOverflow = waitingEntries.slice(3);
    const hasActiveGuests = waitingEntries.length > 0 || servingEntries.length > 0;
    const servingCount = servingEntries.length;
    const servingGridClass =
        servingCount <= 1
            ? "grid-cols-1"
            : servingCount === 2
                ? "grid-cols-1 md:grid-cols-2"
                : servingCount <= 4
                    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6";

    return (
        <div className={cn(
            "min-h-screen bg-slate-50 text-slate-900 p-2 md:p-4 lg:p-6 flex flex-col gap-3 lg:gap-4 overflow-x-hidden w-full max-w-[100vw]",
            isRTL ? "font-arabic" : ""
        )} dir={isRTL ? "rtl" : "ltr"}>
            {/* Premium Elite Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 px-4 py-4 md:px-10 md:py-8 rounded-[24px] md:rounded-[32px] shadow-2xl border border-slate-800 gap-4 md:gap-6">
                <div className="space-y-0.5 md:space-y-1 text-center md:text-left">
                    <h1 className="text-2xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-none">{business?.name || "BUSINESS"}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-slate-400 font-black text-[10px] md:text-base">
                        <Monitor className="h-3 w-3 md:h-5 md:w-5" />
                        <span className="uppercase tracking-[0.2em] md:tracking-[0.4em]">{t('display.title')}</span>
                    </div>
                </div>
                <div className={cn("flex flex-col", isRTL ? "items-center md:items-start text-center md:text-left" : "items-center md:items-end text-center md:text-right")}>
                    <p className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums text-white leading-tight">
                        {currentTime.toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s*(AM|PM|ص|م)/i, '')}
                        <span className="text-xl md:text-3xl ml-1 md:ml-2 opacity-40 uppercase">
                            {currentTime.toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).slice(-2)}
                        </span>
                    </p>
                    <p className="text-[10px] md:text-base font-black text-slate-500 uppercase tracking-widest mt-1">
                        {currentTime.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="bg-white border border-slate-100 rounded-2xl md:rounded-3xl px-4 py-3 shadow-sm">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">{t('display.now_serving')}</p>
                    <p className="text-2xl md:text-4xl font-black text-slate-900">{servingEntries.length}</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl md:rounded-3xl px-4 py-3 shadow-sm">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">{t('queue.active_guests')}</p>
                    <p className="text-2xl md:text-4xl font-black text-slate-900">{waitingEntries.length}</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-3">
                <section className={cn("lg:col-span-8 flex flex-col gap-3 min-h-0", !hasActiveGuests && "lg:col-span-12")}>
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-8 w-8 bg-emerald-600 rounded-lg flex shrink-0 items-center justify-center text-white shadow-lg">
                            <Play className={cn("h-4 w-4 fill-current", isRTL && "rotate-180")} />
                        </div>
                        <h2 className="text-base md:text-2xl font-black uppercase tracking-widest text-slate-900">{t('display.now_serving')}</h2>
                    </div>

                    {servingEntries.length === 1 ? (
                        <div className="flex-1 min-h-[45vh] md:min-h-[58vh] rounded-[24px] bg-emerald-600 text-white border-4 border-emerald-500 shadow-2xl flex items-center justify-center relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-white/80 text-xs font-black uppercase tracking-widest">{t('status.serving')}</div>
                            <div className="text-center px-6">
                                <div className="text-[clamp(56px,14vw,180px)] font-black leading-none tracking-tight">{servingEntries[0]?.display_token || "--"}</div>
                            </div>
                        </div>
                    ) : servingEntries.length > 1 ? (
                        <div className={cn("grid gap-3 flex-1", servingGridClass)}>
                            {servingEntries.map((item) => (
                                <div key={item.id} className="rounded-[20px] bg-emerald-600 text-white border-2 border-emerald-500 shadow-xl flex flex-col items-center justify-center p-4 min-h-[120px] md:min-h-[180px]">
                                    <span className="text-[10px] uppercase tracking-widest font-black text-white/90">{t('status.serving')}</span>
                                    <span className="text-[clamp(36px,6vw,96px)] font-black leading-none">{item?.display_token || "--"}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 rounded-[24px] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-center p-6">
                            <p className="text-lg md:text-3xl font-black text-slate-300 uppercase tracking-widest">{t('display.waiting_for_next')}</p>
                        </div>
                    )}
                </section>

                <aside className={cn("lg:col-span-4 flex flex-col gap-3 min-h-0", !hasActiveGuests && "hidden")}>
                    <div className="rounded-[20px] border border-blue-100 bg-blue-50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Bell className="h-4 w-4 text-blue-700" />
                            <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-blue-900">Next</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {nextEntries.length > 0 ? nextEntries.map((item) => (
                                <div key={item.id} className="rounded-xl bg-blue-600 text-white px-3 py-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Next</span>
                                    <span className="text-[clamp(20px,4.8vw,38px)] font-black leading-none">{item?.display_token || "--"}</span>
                                </div>
                            )) : (
                                <div className="rounded-xl bg-white border border-blue-100 p-3 text-xs font-bold text-blue-900">No next token</div>
                            )}
                        </div>
                    </div>

                    {!(waitingOverflow.length > 6) && (
                        <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-3 flex-1 min-h-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-amber-800" />
                                <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-amber-900">{t('status.waiting')}</h3>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[34vh] md:max-h-[44vh] pr-1 scrollbar-hide">
                                {waitingOverflow.length > 0 ? waitingOverflow.map((item) => (
                                    <div key={item.id} className="rounded-xl bg-amber-100 text-amber-900 px-3 py-2 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{t('status.waiting')}</span>
                                        <span className="text-[clamp(18px,3.5vw,28px)] font-black leading-none">{item?.display_token || "--"}</span>
                                    </div>
                                )) : (
                                    <div className="rounded-xl bg-white border border-amber-100 p-3 text-xs font-bold text-amber-900">No waiting tokens</div>
                                )}
                            </div>
                        </div>
                    )}
                    {(waitingOverflow.length > 6) && (
                        <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-3 flex-1 min-h-0 hidden md:block">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-amber-800" />
                                <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-amber-900">{t('status.waiting')}</h3>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[34vh] md:max-h-[44vh] pr-1 scrollbar-hide">
                                {waitingOverflow.map((item) => (
                                    <div key={item.id} className="rounded-xl bg-amber-100 text-amber-900 px-3 py-2 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{t('status.waiting')}</span>
                                        <span className="text-[clamp(18px,3.5vw,28px)] font-black leading-none">{item?.display_token || "--"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-slate-900 rounded-[20px] flex items-center gap-3 text-white shadow-xl relative overflow-hidden">
                        <div className="h-16 w-16 bg-white p-2 rounded-xl shadow-xl relative z-10 shrink-0">
                            {!!origin && (
                                <QRCodeSVG
                                    value={`${origin}/${slug}`}
                                    size={96}
                                    level="H"
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                        <div className="space-y-1 relative z-10 min-w-0">
                            <h3 className={cn("text-sm font-black uppercase tracking-widest", language === 'hi' ? "leading-tight" : "leading-none")}>{t('display.scan_to_join')}</h3>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate">{t('queue.join_link')}</p>
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full border border-white/10">
                                <Wifi className="h-3 w-3 text-emerald-400 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-widest">{t('queue.active_queue')}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Bottom Ticker */}
            <div className="flex items-center gap-4 md:gap-12 bg-slate-900 py-3 md:py-7 px-4 md:px-12 rounded-full shadow-2xl border border-slate-800">
                <div className="flex items-center gap-2 md:gap-4 text-white shrink-0">
                    <div className="h-2 w-2 md:h-4 md:w-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <span className="font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xl italic">{t('queue.title')}</span>
                </div>
                <div className="h-4 md:h-10 w-px md:w-[2px] bg-slate-800" />
                <div className="flex-1 overflow-hidden whitespace-nowrap">
                    <div className="inline-block text-[10px] md:text-xl font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                        {t('display.welcome')} {business?.name || ""} • {String(t('display.please_wait') || 'PLEASE WAIT FOR YOUR TURN').toUpperCase().includes('PLEASE') ? String(t('display.please_wait') || 'PLEASE WAIT FOR YOUR TURN') : 'PLEASE WAIT FOR YOUR TURN'} • {t('display.scan_to_join')} • {t('display.estimated_wait')} {formatDuration(waitingEntries.length * 10, t)} •
                    </div>
                </div>
            </div>
        </div>
    );
}
