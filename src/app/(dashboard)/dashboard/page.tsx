"use client";

import { useEffect, useState } from "react";
import { Users, Clock, CalendarCheck, TrendingUp, Wallet, Share2, QrCode, Monitor, X, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService, DailySummary } from "@/services/analyticsService";
import { queueService } from "@/services/queueService";
import { businessService } from "@/services/businessService"; // Assuming businessService is needed for business data
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [stats, setStats] = useState([
        { name: t('dashboard.total_visitors'), value: '0', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { name: t('dashboard.completed_visits'), value: '0', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        { name: t('dashboard.today_revenue'), value: '0', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: t('dashboard.avg_wait_time'), value: '0m', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    ]);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null); // State to hold business data
    const [isQRModalOpen, setIsQRModalOpen] = useState(false); // State for QR modal visibility
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Live Analytics States
    const [popularServices, setPopularServices] = useState<{ name: string, count: number, color: string }[]>([]);
    const [queueHealth, setQueueHealth] = useState({ completed: 0, waiting: 0, serving: 0, skipped: 0 });

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        }
    };

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // Fetch daily summary
                const summary = await analyticsService.getDailySummary();
                const myBusiness = await businessService.getMyBusiness(); // Fetch business data
                setBusiness(myBusiness);

                // Fetch active queues to get serving/waiting counts
                const queues = await queueService.getMyQueues();
                // We calculate precise queue health
                if (myBusiness) {
                    try {
                        const providerAnalytics = await analyticsService.getProviderAnalytics({
                            business_id: myBusiness.id,
                            range: 'daily'
                        });

                        const serviceMap: Record<string, number> = {};
                        if (providerAnalytics && providerAnalytics.data) {
                            providerAnalytics.data.forEach((p: any) => {
                                p.service_breakdown?.forEach((s: any) => {
                                    serviceMap[s.service_name] = (serviceMap[s.service_name] || 0) + s.count;
                                });
                            });
                        }

                        const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500'];
                        const top = Object.entries(serviceMap)
                            .map(([name, count]) => ({ name, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 4)
                            .map((s, i) => ({ ...s, color: colors[i] }));

                        setPopularServices(top);

                        if (queues.length > 0) {
                            const entries = await queueService.getQueueEntriesToday(queues[0].id);
                            // Set completed directly from summary since getQueueEntriesToday filters out paid ones
                            const health = { completed: summary.completedVisits || 0, waiting: 0, serving: 0, skipped: 0 };
                            entries.forEach((e: any) => {
                                if (e.status === 'completed' && health.completed === 0) health.completed++; // fallback
                                else if (e.status === 'waiting') health.waiting++;
                                else if (e.status === 'serving') health.serving++;
                                else if (e.status === 'skipped' || e.status === 'no_show') health.skipped++;
                            });
                            setQueueHealth(health);
                        }
                    } catch (err) {
                        console.error("Failed fetching live analytics data:", err);
                    }
                }

                setStats([
                    { name: t('dashboard.total_visitors'), value: summary.totalCustomers.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { name: t('dashboard.completed_visits'), value: summary.completedVisits.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { name: t('dashboard.today_revenue'), value: formatCurrency(summary.totalRevenue, myBusiness?.currency, language), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { name: t('dashboard.avg_wait_time'), value: `${summary.avgWaitTimeMinutes}m`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                ]);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [language]);

    return (
        <div className="relative">
            {/* Verification Pending Overlay */}
            {user?.status === 'pending' && (
                <div className="absolute inset-0 z-[50] rounded-[40px] bg-white/60 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                    <div className="max-w-md p-10 bg-white border border-slate-100 shadow-2xl rounded-[40px] animate-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                            <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-4">{t('dashboard.verification_pending')}</h2>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            {t('dashboard.verification_desc')}
                        </p>
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {t('dashboard.approval_24h')}
                        </div>
                    </div>
                </div>
            )}

            <div className={cn(
                "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700",
                user?.status === 'pending' && "opacity-40 pointer-events-none select-none filter blur-[1px]"
            )}>
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('dashboard.business_overview')}</h1>
                    <p className="text-sm font-semibold text-slate-500">{t('dashboard.real_time_insights')}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.name} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group cursor-default">
                            <div className="flex items-center justify-between">
                                <div className={cn(stat.bg, stat.color, "p-3 rounded-xl transition-transform duration-300 group-hover:scale-105")}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
                                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                                    {loading ? "..." : stat.value}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('dashboard.live_analytics')}</p>
                                <p className="text-sm mt-1 font-medium text-slate-400">{t('dashboard.live_analytics_desc')}</p>
                            </div>
                            <div className="animate-pulse h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                            {/* Left: Queue Health */}
                            <div className="flex flex-col gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.queue_health')}</p>
                                {queueHealth.completed === 0 && queueHealth.waiting === 0 && queueHealth.serving === 0 && queueHealth.skipped === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                        <TrendingUp className="h-8 w-8 text-slate-400 mb-2" />
                                        <p className="text-xs font-medium text-slate-500">{t('dashboard.no_entries_today')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Completed */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                                <CalendarCheck className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 leading-none">{t('dashboard.completed')}</p>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (queueHealth.completed / 20) * 100)}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{queueHealth.completed}</div>
                                        </div>
                                        {/* Serving */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 leading-none">{t('dashboard.in_service')}</p>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                                                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${queueHealth.serving > 0 ? 100 : 0}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{queueHealth.serving}</div>
                                        </div>
                                        {/* Waiting */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                                <Clock className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 leading-none">{t('dashboard.waiting')}</p>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                                                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (queueHealth.waiting / 20) * 100)}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{queueHealth.waiting}</div>
                                        </div>
                                        {/* Skipped */}
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 shrink-0 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                                                <X className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 leading-none">{t('dashboard.dropped_no_show')}</p>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                                                    <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (queueHealth.skipped / 20) * 100)}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-slate-900">{queueHealth.skipped}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Service Popularity */}
                            <div className="flex flex-col gap-6 p-4 rounded-xl">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.top_services_ranked')}</p>
                                <div className="space-y-4">
                                    {popularServices.length === 0 ? (
                                        <p className="text-xs font-semibold text-slate-500 italic">{t('dashboard.no_services_completed')}</p>
                                    ) : (
                                        popularServices.map((s, idx) => {
                                            const maxCount = popularServices[0].count;
                                            const pct = Math.max(10, (s.count / maxCount) * 100);
                                            return (
                                                <div key={idx} className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                                        <span className="truncate pr-4">{s.name}</span>
                                                        <span>{s.count}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className={cn("h-full rounded-full transition-all duration-1000", s.color)} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-semibold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-slate-500" />
                            {t('dashboard.smart_tools')}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsQRModalOpen(true)}
                                    disabled={!business}
                                    className="flex-1 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center gap-3 text-indigo-600 hover:bg-indigo-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <QrCode className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.business_qr')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (business) {
                                            const link = `${window.location.host}/display/${business.slug}`;
                                            window.open(`http://${link}`, '_blank');
                                        }
                                    }}
                                    disabled={!business}
                                    className="flex-1 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center justify-center gap-3 text-amber-600 hover:bg-amber-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Monitor className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">{t('dashboard.tv_mode')}</span>
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dashboard.public_link')}</p>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {business ? `${window.location.host}/${business.slug}` : t('dashboard.loading')}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (!business?.slug) {
                                                alert(t('dashboard.loading_business_details'));
                                                return;
                                            }
                                            const url = `${window.location.origin}/p/${business.slug}`;
                                            navigator.clipboard.writeText(url);
                                            setIsCopied(true);
                                            setTimeout(() => setIsCopied(false), 3000);
                                        }}
                                        disabled={!business?.slug}
                                        className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-200 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {showInstallBtn && (
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-between gap-3 text-emerald-700 hover:bg-emerald-100 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                            <Monitor className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold uppercase tracking-wider">{t('dashboard.install_app')}</p>
                                            <p className="text-xs font-medium opacity-70">{t('dashboard.save_to_home_screen')}</p>
                                        </div>
                                    </div>
                                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                        +
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={() => window.location.href = '/dashboard/queue'}
                                className="w-full flex items-center justify-center bg-slate-900 border border-slate-900 text-white rounded-xl px-4 py-3 text-sm font-semibold tracking-wide shadow-sm hover:bg-slate-800 transition-all active:scale-95"
                            >
                                {t('dashboard.manage_live_queue')}
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 w-full flex flex-col items-center justify-center space-y-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.queue_system_version')}</span>
                        </div>
                    </div>
                </div>

                {/* QR Code Modal */}
                {isQRModalOpen && business && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10 flex flex-col items-center text-center space-y-8">
                                <div className="flex items-center justify-between w-full mb-2">
                                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{t('dashboard.business_qr_code')}</h3>
                                    <button onClick={() => setIsQRModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-8 bg-white border-4 border-slate-50 rounded-[48px] shadow-inner">
                                    <QRCodeSVG
                                        value={`${window.location.origin}/p/${business.slug}`}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <p className="text-lg font-bold text-slate-900">{business.name}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.scan_to_join')}</p>
                                </div>

                                <button
                                    onClick={() => window.print()}
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Printer className="h-4 w-4" /> {t('dashboard.print_qr_code')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Dashboard Toast Notifications */}
                {isCopied && (
                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400/50 backdrop-blur-md">
                            <Users className="h-5 w-5 text-white/50" />
                            <p className="text-sm font-bold uppercase tracking-wider">{t('dashboard.link_copied_toast')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
