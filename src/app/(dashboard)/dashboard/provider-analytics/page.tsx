"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    IndianRupee,
    Layout,
    Loader2,
    Search,
    TrendingUp,
    Users,
    Filter
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService, ProviderAnalytics, AnalyticsSummaryStats } from "@/services/analyticsService";
import { format } from "date-fns";
import { ProviderServiceBreakdownModal } from "./components/ProviderServiceBreakdownModal";
import { useLanguage } from "@/context/LanguageContext";

type Range = 'daily' | 'weekly' | 'monthly';

export default function ProviderAnalyticsPage() {
    const { business } = useAuth();
    const { t, language } = useLanguage();
    const [range, setRange] = useState<Range>('daily');
    const [date, setDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProviderAnalytics[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummaryStats | null>(null);
    const [search, setSearch] = useState("");

    // Modal State
    const [selectedProvider, setSelectedProvider] = useState<ProviderAnalytics | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        if (!business?.id) return;
        setLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const response = await analyticsService.getProviderAnalytics({
                business_id: business.id,
                range,
                date: dateStr
            });
            setData(response.data);
            setSummary(response.summary);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [business?.id, range, date]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handlePrev = () => {
        const newDate = new Date(date);
        if (range === 'daily') newDate.setDate(date.getDate() - 1);
        else if (range === 'weekly') newDate.setDate(date.getDate() - 7);
        else if (range === 'monthly') newDate.setMonth(date.getMonth() - 1);
        setDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(date);
        if (range === 'daily') newDate.setDate(date.getDate() + 1);
        else if (range === 'weekly') newDate.setDate(date.getDate() + 7);
        else if (range === 'monthly') newDate.setMonth(date.getMonth() + 1);
        setDate(newDate);
    };

    const periodLabel = () => {
        if (range === 'daily') return format(date, 'MMM dd, yyyy');
        if (range === 'weekly') {
            const start = new Date(date);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(start.setDate(diff));
            const sun = new Date(new Date(mon).setDate(mon.getDate() + 6));
            return `${format(mon, 'MMM dd')} - ${format(sun, 'MMM dd')}`;
        }
        return format(date, 'MMMM yyyy');
    };

    const filteredData = (data || []).filter(p =>
        p.provider_name.toLowerCase().includes(search.toLowerCase())
    );

    const openBreakdown = (p: ProviderAnalytics) => {
        setSelectedProvider(p);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        {t('provider_analytics.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {t('provider_analytics.subtitle')}
                    </p>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    {(['daily', 'weekly', 'monthly'] as Range[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => {
                                setRange(r);
                                setDate(new Date()); // Reset to current period on range change
                            }}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                                range === r
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            {t(`provider_analytics.${r}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 justify-center">
                        <button
                            onClick={handlePrev}
                            className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
                        >
                            <ChevronLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div className="flex flex-col items-center min-w-[160px]">
                            <span className="text-lg font-bold text-slate-900 tracking-tight">
                                {periodLabel()}
                            </span>
                            <span className="text-xs font-bold uppercase text-slate-400 tracking-[0.2em]">
                                {t('provider_analytics.selected_period')}
                            </span>
                        </div>
                        <button
                            onClick={handleNext}
                            className="p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
                        >
                            <ChevronRight className="h-5 w-5 text-slate-600" />
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('provider_analytics.search_expert')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: t('provider_analytics.total_services'), value: summary?.total_services || 0, icon: Layout, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: t('provider_analytics.total_revenue'), value: formatCurrency(summary?.total_revenue || 0, business?.currency, language), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: t('provider_analytics.avg_service_time'), value: `${summary?.avg_service_time || 0}m`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className={cn("p-3 rounded-xl", stat.bg)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                            <span className="text-3xl font-bold text-slate-900 tracking-tight">
                                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-200" /> : stat.value}
                            </span>
                        </div>
                        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Metrics Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        {t('provider_analytics.expert_performance')}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                        <Filter className="h-3 w-3" />
                        {t('provider_analytics.refined_metrics')}
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/20 mx-auto" />
                        <p className="text-sm font-bold text-slate-400 mt-4 uppercase tracking-wider">{t('provider_analytics.crunching_numbers')}</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 italic font-medium">
                        {t('provider_analytics.no_metrics')}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredData.map((p) => (
                            <div
                                key={p.provider_id}
                                className="group hover:bg-slate-50 transition-all cursor-pointer p-4 md:px-6"
                                onClick={() => openBreakdown(p)}
                            >
                                {/* Provider Name Row */}
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-sm font-bold uppercase tracking-tighter shadow-lg shadow-slate-900/10">
                                            {p.provider_name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-slate-900 uppercase text-sm tracking-tight block break-words">{p.provider_name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-60">{t('provider_analytics.id')}: {p.provider_id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openBreakdown(p); }}
                                        className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                    >
                                        {t('provider_analytics.details')}
                                    </button>
                                </div>

                                {/* Stats Grid - 2x2 on mobile, 4 in a row on desktop */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-13">
                                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('provider_analytics.services')}</p>
                                        <span className="font-bold text-slate-900 text-sm">{p.services_completed}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('provider_analytics.revenue')}</p>
                                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(p.total_revenue, business?.currency, language)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('provider_analytics.avg_time')}</p>
                                        <span className="font-bold text-slate-900 text-sm">{p.avg_service_time_minutes}m</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('provider_analytics.active_mins')}</p>
                                        <span className="font-bold text-slate-900 text-sm">{p.total_active_minutes.toFixed(0)}m</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {/* Service Breakdown Modal */}
            <ProviderServiceBreakdownModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                provider={selectedProvider}
                periodLabel={periodLabel()}
            />
        </div>
    );
}
