"use client";

import { useEffect, useState } from "react";
import { Users, Clock, CalendarCheck, TrendingUp, IndianRupee, Share2, QrCode, Monitor, X, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService, DailySummary } from "@/services/analyticsService";
import { queueService } from "@/services/queueService";
import { businessService } from "@/services/businessService"; // Assuming businessService is needed for business data

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState([
        { name: 'Currently Serving', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: 'Waiting in Queue', value: '0', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
        { name: 'Today\'s Revenue', value: '₹0', icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-100' },
        { name: 'Avg. Wait Time', value: '0m', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    ]);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<any>(null); // State to hold business data
    const [isQRModalOpen, setIsQRModalOpen] = useState(false); // State for QR modal visibility
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

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
                let currentlyServing = 0;
                let waitingCount = 0;

                queues.forEach(q => {
                    // This is a simplification, ideally we'd get precise counts from backend
                    // But for now we use the summary or queue data
                });

                setStats([
                    { name: 'Total Customers', value: summary.totalCustomers.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { name: 'Completed Visits', value: summary.completedVisits.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
                    { name: 'Today\'s Revenue', value: `₹${summary.totalRevenue}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-100' },
                    { name: 'Avg. Wait Time', value: `${summary.avgWaitTimeMinutes}m`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
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
    }, []);

    return (
        <div className="relative">
            {/* Verification Pending Overlay */}
            {user?.status === 'pending' && (
                <div className="absolute inset-0 z-[50] rounded-[40px] bg-white/60 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                    <div className="max-w-md p-10 bg-white border border-slate-100 shadow-2xl rounded-[40px] animate-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                            <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Verification Pending</h2>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            Aapka account review mein hai. Admin ki approval ke baad hi aap queues aur appointments manage kar payenge.
                        </p>
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Expect approval within 24 hours
                        </div>
                    </div>
                </div>
            )}

            <div className={cn(
                "space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700",
                user?.status === 'pending' && "opacity-40 pointer-events-none select-none filter blur-[1px]"
            )}>
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Overview</h1>
                    <p className="text-sm font-semibold text-slate-600">Real-time performance and queue insights.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.name} className="pro-card p-6 group cursor-default">
                            <div className="flex items-center justify-between">
                                <div className={cn(stat.bg, stat.color, "p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110")}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-5">
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{stat.name}</p>
                                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                                    {loading ? "..." : stat.value}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 pro-card p-8 flex flex-col items-center justify-center text-slate-600 bg-white">
                        <TrendingUp className="h-10 w-10 mb-3 opacity-30 text-blue-600" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Analytics</p>
                        <p className="text-xs mt-1 font-medium text-slate-400">Data automatically refreshes every 30 seconds.</p>
                    </div>

                    <div className="pro-card p-6 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Smart Tools</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsQRModalOpen(true)}
                                    disabled={!business}
                                    className="flex-1 p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-600 hover:bg-indigo-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <QrCode className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Business QR</span>
                                </button>
                                <button
                                    onClick={() => window.open('/dashboard/display', '_blank')}
                                    disabled={!business}
                                    className="flex-1 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-amber-600 hover:bg-amber-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Monitor className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">TV Mode</span>
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Public Link</p>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold text-slate-600 truncate">
                                        {business ? `${window.location.host}/${business.slug}` : 'Loading...'}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (!business?.slug) {
                                                alert("Business details still loading...");
                                                return;
                                            }
                                            const url = `${window.location.origin}/${business.slug}`;
                                            navigator.clipboard.writeText(url);
                                            alert("Link copied!");
                                        }}
                                        disabled={!business?.slug}
                                        className="p-2 bg-white text-blue-600 rounded-lg shadow-sm border border-slate-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
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
                                            <p className="text-xs font-black uppercase tracking-wider">Install App</p>
                                            <p className="text-[10px] font-medium opacity-70">Save to your home screen</p>
                                        </div>
                                    </div>
                                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                        +
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={() => window.location.href = '/dashboard/queue'}
                                className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 leading-none"
                            >
                                MANAGE LIVE QUEUE
                            </button>
                        </div>

                        <div className="mt-auto pt-8 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Professional Admin</span>
                        </div>
                    </div>
                </div>

                {/* QR Code Modal */}
                {isQRModalOpen && business && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-10 flex flex-col items-center text-center space-y-8">
                                <div className="flex items-center justify-between w-full mb-2">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Business QR Code</h3>
                                    <button onClick={() => setIsQRModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-8 bg-white border-4 border-slate-50 rounded-[48px] shadow-inner">
                                    <QRCodeSVG
                                        value={`${window.location.origin}/${business.slug}`}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <p className="text-lg font-black text-slate-900">{business.name}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Scan to Join Queue</p>
                                </div>

                                <button
                                    onClick={() => window.print()}
                                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Printer className="h-4 w-4" /> Print QR Code
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
