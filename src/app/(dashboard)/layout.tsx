"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { business } = useAuth();
    const { t } = useLanguage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const segment = pathname.split('/').pop() || 'dashboard';
    const pageTitle = segment === 'dashboard' ? 'Overview' : segment.replace(/-/g, ' ');

    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-background relative">
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                    isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
                )}>
                    <Sidebar
                        onClose={() => setIsSidebarOpen(false)}
                        isCollapsed={isSidebarCollapsed}
                        forceLanguage={pathname.startsWith('/dashboard/admin') ? 'en' : undefined}
                    />
                </div>

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-300 shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 text-slate-600 hover:text-primary lg:hidden"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="hidden lg:flex p-2 -ml-2 text-slate-600 hover:text-primary transition-colors"
                                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            >
                                <svg className={cn("h-6 w-6 transition-transform", isSidebarCollapsed ? "rotate-180" : "rotate-0")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider truncate">
                                    {business?.name || 'Dashboard'}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {!pathname.startsWith('/dashboard/admin') && <LanguageSwitcher />}
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-bold text-slate-900">{t('dashboard.business_portal')}</p>
                                <button
                                    onClick={() => { if (business?.slug) window.location.href = `/p/${business.slug}`; }}
                                    className="text-xs font-extrabold text-primary uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                    {t('dashboard.view_public_page')}
                                </button>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                {business?.name?.charAt(0) || 'AD'}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8 lg:p-12">
                        <div className="max-w-full mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
