"use client";

import React from 'react';
import { X, Layout, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { ProviderAnalytics, ProviderServiceStats } from "@/services/analyticsService";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

interface ProviderServiceBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: ProviderAnalytics | null;
    periodLabel: string;
}

export const ProviderServiceBreakdownModal: React.FC<ProviderServiceBreakdownModalProps> = ({
    isOpen,
    onClose,
    provider,
    periodLabel
}) => {
    const { t, language } = useLanguage();
    const { business } = useAuth();

    if (!isOpen || !provider) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 py-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                                {provider.provider_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight wrap-break-word">
                                {provider.provider_name}
                            </h2>
                        </div>
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2 flex-wrap">
                            <TrendingUp className="h-3 w-3 shrink-0" />
                            <span>{t('provider_analytics.service_breakdown')} • {periodLabel}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-8 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        {provider.service_breakdown.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 italic">
                                {t('provider_analytics.no_service_data')}
                            </div>
                        ) : (
                            provider.service_breakdown.map((s, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                            <CheckCircle2 className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-tight">{s.service_name}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                    <Layout className="h-3 w-3" />
                                                    {s.count} {s.count === 1 ? t('provider_analytics.task') : t('provider_analytics.tasks')}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDuration(s.avg_time, t)} {t('provider_analytics.avg')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-600">
                                            {formatCurrency(s.revenue, business?.currency, language)}
                                        </div>
                                        <div className="text-[9px] font-bold uppercase text-slate-400 tracking-tighter mt-0.5">
                                            {t('provider_analytics.total_revenue_stats')}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>

                {/* Footer Stats */}
                <div className="px-5 py-5 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-6">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('provider_analytics.combined_output')}</p>
                            <p className="text-lg font-bold text-white tracking-tight">{formatCurrency(provider.total_revenue, business?.currency, language)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('provider_analytics.efficiency')}</p>
                             <p className="text-lg font-bold text-white tracking-tight">{formatDuration(provider.avg_service_time_minutes, t)} {t('provider_analytics.avg')}</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                    >
                        {t('provider_analytics.close_portal')}
                    </button>
                </div>
            </div>
        </div>
    );
};
