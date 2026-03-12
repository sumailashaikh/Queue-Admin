"use client";

import { useEffect, useState, use } from "react";
import { Users, Clock, Loader2, Monitor, Play, Wifi, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
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

    const isRTL = language === 'ar';

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

                // Auto-set language to business language if defined (do not persist locally to user)
                if (res.business?.language && res.business.language !== language) {
                    setLanguage(res.business.language, false);
                }
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
                    if (res.business?.language && res.business.language !== language) {
                        setLanguage(res.business.language, false);
                    }
                } catch (err) {
                    console.error("Poll failed", err);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [slug, setLanguage, language]);

    const getTranslatedServiceName = (item: any) => {
        if (!item.translations || item.translations.length === 0) return item.service_name;

        // Since item.translations is an array of translation objects from multiple services
        // we map them.
        const translatedNames = item.translations.map((trans: any) => {
            if (trans && trans[language]) return trans[language];
            return null;
        }).filter(Boolean);

        if (translatedNames.length > 0) return translatedNames.join(', ');
        return item.service_name;
    };

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

    const servingEntries = entries.filter(e => e.status === 'serving').slice(0, 3);
    const waitingEntries = entries.filter(e => e.status === 'waiting' || e.status === 'checked_in');

    return (
        <div className={cn(
            "min-h-screen bg-slate-50 text-slate-900 p-2 md:p-12 flex flex-col gap-4 md:gap-12 overflow-hidden",
            isRTL ? "font-arabic" : ""
        )} dir={isRTL ? "rtl" : "ltr"}>
            {/* Premium Elite Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 px-4 py-4 md:px-12 md:py-10 rounded-[24px] md:rounded-[32px] shadow-2xl border border-slate-800 gap-4 md:gap-6">
                <div className="space-y-0.5 md:space-y-1 text-center md:text-left">
                    <h1 className="text-2xl md:text-6xl font-black tracking-tight text-white uppercase italic leading-none">{business.name}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 text-slate-400 font-black text-[10px] md:xl">
                        <Monitor className="h-3 w-3 md:h-6 md:w-6" />
                        <span className="uppercase tracking-[0.2em] md:tracking-[0.4em]">{t('display.title')}</span>
                    </div>
                </div>
                <div className={cn("flex flex-col", isRTL ? "items-center md:items-start text-center md:text-left" : "items-center md:items-end text-center md:text-right")}>
                    <p className="text-4xl md:text-8xl font-black tracking-tighter tabular-nums text-white leading-tight">
                        {currentTime.toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s*(AM|PM|ص|م)/i, '')}
                        <span className="text-xl md:text-4xl ml-1 md:ml-2 opacity-40 uppercase">
                            {currentTime.toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).slice(-2)}
                        </span>
                    </p>
                    <p className="text-[10px] md:text-xl font-black text-slate-500 uppercase tracking-widest mt-1 md:mt-2">
                        {currentTime.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'ar' ? 'ar-SA' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-12 flex-1 min-h-0">
                {/* Left: Now Serving (High-End Clarity) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
                    <div className="flex items-center gap-3 md:gap-4 px-2 md:px-6">
                        <div className="h-8 w-8 md:h-14 md:w-14 bg-slate-900 rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-lg md:shadow-xl shadow-slate-200">
                            <Play className={cn("h-4 w-4 md:h-8 md:w-8 fill-current", isRTL && "rotate-180")} />
                        </div>
                        <h2 className="text-lg md:text-4xl font-black uppercase tracking-widest text-slate-900">{t('display.now_serving')}</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8 flex-1">
                        {servingEntries.length > 0 ? (
                            servingEntries.map((item, idx) => (
                                <div key={item.id} className={cn(
                                    "flex flex-col md:flex-row items-center justify-between p-4 md:p-12 rounded-[24px] md:rounded-[48px] border-2 md:border-4 transition-all duration-700 gap-4 md:gap-6",
                                    idx === 0
                                        ? "bg-white border-slate-900 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.08)] md:shadow-[0_40px_100px_rgba(0,0,0,0.1)] scale-[1.01] md:scale-[1.02]"
                                        : "bg-white border-slate-100 text-slate-900 shadow-xl opacity-60"
                                )}>
                                    <div className="space-y-4 md:space-y-6 text-center md:text-left">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                                            <span className="px-3 py-1 md:px-5 md:py-2 bg-slate-100 rounded-full text-[10px] md:text-base font-black text-slate-500 uppercase tracking-widest">
                                                {getTranslatedServiceName(item) || t('services.default_desc')}
                                            </span>
                                            {idx === 0 && (
                                                <span className="px-3 py-1 md:px-5 md:py-2 bg-emerald-500 rounded-full text-[10px] md:text-base font-black text-white uppercase tracking-widest animate-pulse">
                                                    {t('admin.active')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-3xl md:text-8xl font-black tracking-tighter capitalize leading-none break-words max-w-[240px] md:max-w-none">{item.customer_name}</p>
                                    </div>
                                    <div className={cn(
                                        "h-24 md:h-52 w-full md:w-72 max-w-[200px] md:max-w-none rounded-[20px] md:rounded-[40px] flex flex-col items-center justify-center font-black shadow-2xl px-4 text-center border-2 md:border-4",
                                        idx === 0 ? "bg-slate-900 text-white border-slate-800" : "bg-white text-slate-900 border-slate-100"
                                    )}>
                                        <span className="text-[7px] md:text-[10px] uppercase tracking-[0.4em] opacity-40 mb-1 md:mb-2">{t('display.token')}</span>
                                        <span className={cn(
                                            "leading-none",
                                            item.display_token?.length > 3 ? "text-2xl md:text-6xl" : "text-4xl md:text-[120px]"
                                        )}>
                                            {item.display_token}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 rounded-[48px] bg-white border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12 shadow-inner">
                                <Clock className="h-32 w-32 text-slate-100 mb-8" />
                                <p className="text-4xl font-black text-slate-200 uppercase tracking-widest">{t('display.waiting_for_next')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Waitlist & Interactions */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 md:gap-10 bg-white rounded-[24px] md:rounded-[48px] border border-slate-100 p-4 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4 md:pb-8">
                        <div className="flex items-center gap-2 md:gap-4">
                            <Users className="h-5 w-5 md:h-10 md:w-10 text-slate-900" />
                            <h2 className="text-lg md:text-3xl font-black uppercase tracking-widest text-slate-900">{t('sidebar.live_queue')}</h2>
                        </div>
                        <div className="px-3 py-1 md:px-8 md:py-3 bg-slate-900 text-white rounded-full text-xs md:text-2xl font-black shadow-lg flex items-center gap-2">
                            <span>{waitingEntries.length}</span>
                            <span className="hidden sm:inline">{t('queue.active_guests').toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 md:space-y-6 overflow-y-auto pr-1 md:pr-4 scrollbar-hide">
                        {waitingEntries.slice(0, 8).map((item) => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-3 md:px-10 md:py-8 bg-slate-50/50 rounded-[16px] md:rounded-[32px] border border-slate-100 hover:border-slate-900 transition-all hover:bg-white group">
                                <div className="space-y-0.5 md:space-y-1">
                                    <p className="text-base md:text-4xl font-black text-slate-900 group-hover:text-black transition-colors capitalize">{item.customer_name}</p>
                                    <p className="text-[10px] md:text-lg font-black text-slate-400 uppercase tracking-[0.1em]">{getTranslatedServiceName(item)}</p>
                                </div>
                                <div className="h-8 md:h-20 min-w-[3rem] md:min-w-[8rem] w-auto px-2 md:px-6 bg-white rounded-[8px] md:rounded-[24px] border border-slate-100 flex items-center justify-center text-sm md:text-3xl font-black text-slate-900 shadow-sm group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all max-w-[6rem] md:max-w-[12rem] truncate overflow-hidden">
                                    {item.display_token}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Elite QR Engagement Block */}
                    <div className="mt-2 md:mt-8 p-4 md:p-12 bg-slate-900 rounded-[24px] md:rounded-[48px] flex flex-col sm:flex-row items-center gap-4 md:gap-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all" />
                        <div className="h-24 w-24 md:h-44 md:w-44 bg-white p-3 md:p-6 rounded-[16px] md:rounded-[32px] shadow-2xl relative z-10 flex-shrink-0">
                            {typeof window !== 'undefined' && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/${slug}`}
                                    size={128}
                                    level="H"
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                        <div className="space-y-1 md:space-y-3 relative z-10 text-center sm:text-left">
                            <h3 className={cn("text-lg md:text-3xl xl:text-4xl break-words max-w-[16rem] font-black tracking-tighter uppercase", language === 'hi' ? "leading-tight" : "leading-none italic")}>{t('display.scan_to_join')}</h3>
                            <p className="text-[10px] md:text-lg font-bold text-slate-400 leading-tight uppercase tracking-widest">{t('queue.join_link')}</p>
                            <div className="flex items-center gap-2 mt-2 md:mt-6 px-3 py-1.5 bg-white/10 rounded-full w-fit border border-white/10 mx-auto sm:mx-0">
                                <Wifi className="h-2.5 w-2.5 md:h-4 md:w-4 text-emerald-400" />
                                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em]">{t('queue.active_queue')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Scrolling Ticker */}
            <div className="flex items-center gap-4 md:gap-12 bg-slate-900 py-3 md:py-7 px-4 md:px-12 rounded-full shadow-2xl border border-slate-800">
                <div className="flex items-center gap-2 md:gap-4 text-white flex-shrink-0">
                    <div className="h-2 w-2 md:h-4 md:w-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <span className="font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xl italic">{t('queue.title')}</span>
                </div>
                <div className="h-4 md:h-10 w-[1px] md:w-[2px] bg-slate-800" />
                <div className="flex-1 overflow-hidden whitespace-nowrap">
                    <div className="inline-block animate-marquee text-[10px] md:text-xl font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                        {t('display.welcome')} {business.name} • {t('display.please_wait')} • {t('display.scan_to_join')} • {t('display.estimated_wait')} {(waitingEntries.length * 10)} {t('display.min')} •
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(${isRTL ? '-100%' : '0'}); }
                    100% { transform: translateX(${isRTL ? '0' : '-100%'}); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                    display: inline-block;
                    padding-${isRTL ? 'left' : 'right'}: 100%;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
