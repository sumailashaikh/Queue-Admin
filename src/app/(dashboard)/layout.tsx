"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { Bell } from "lucide-react";
import { notificationService, AppNotification } from "@/services/notificationService";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, business } = useAuth();
    const { t: baseT } = useLanguage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const [notifFilter, setNotifFilter] = useState<"unread" | "all">("unread");
    const [headerToast, setHeaderToast] = useState<string | null>(null);
    const firstLoadDoneRef = useRef(false);
    const pathname = usePathname();
    const isAdminPath = pathname.startsWith('/dashboard/admin');
    const t = (key: string, params?: any) => baseT(key, params, isAdminPath ? 'en' : undefined);
    const segment = pathname.split('/').pop() || 'dashboard';
    const pageTitle = segment === 'dashboard' ? 'Overview' : segment.replace(/-/g, ' ');
    const isOwnerLike = ["owner", "admin"].includes(String(user?.role || "").toLowerCase());

    useEffect(() => {
        if (!isOwnerLike || pathname.startsWith('/dashboard/admin')) return;
        let mounted = true;
        const fetchNotifications = async () => {
            try {
                const resp = await notificationService.listMy();
                if (!mounted) return;
                const prevUnread = unreadCount;
                setNotifications(resp.data || []);
                setUnreadCount(resp.unread || 0);
                if (firstLoadDoneRef.current && (resp.unread || 0) > prevUnread) {
                    setHeaderToast(t("dashboard.new_appointment_request_received"));
                    setTimeout(() => setHeaderToast(null), 2500);
                }
                firstLoadDoneRef.current = true;
            } catch {
                // non-blocking
            }
        };
        fetchNotifications();
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            fetchNotifications();
        }, 15000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [isOwnerLike, pathname, unreadCount]);

    const handleMarkOneRead = async (id: string) => {
        await notificationService.markRead(id);
        const next = notifications.map((n) => n.id === id ? { ...n, is_read: true } : n);
        setNotifications(next);
        setUnreadCount(next.filter((n) => !n.is_read).length);
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllRead();
        const next = notifications.map((n) => ({ ...n, is_read: true }));
        setNotifications(next);
        setUnreadCount(0);
    };

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
                                    {pathname.startsWith('/dashboard/admin') ? 'Admin Dashboard' : (business?.name || 'Dashboard')}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {!pathname.startsWith('/dashboard/admin') && <LanguageSwitcher />}
                            {isOwnerLike && !pathname.startsWith('/dashboard/admin') && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifMenu((p) => !p)}
                                        className="relative h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                                    >
                                        <Bell className="h-4 w-4 text-slate-600" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                                                {unreadCount > 9 ? "9+" : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {showNotifMenu && (
                                        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl z-200 p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">{t("dashboard.notifications")}</p>
                                                <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-primary uppercase tracking-wider">{t("dashboard.mark_all_read")}</button>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <button
                                                    onClick={() => setNotifFilter("unread")}
                                                    className={cn("text-[10px] px-2 py-1 rounded-lg font-bold uppercase", notifFilter === "unread" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}
                                                >
                                                    {t("dashboard.unread")}
                                                </button>
                                                <button
                                                    onClick={() => setNotifFilter("all")}
                                                    className={cn("text-[10px] px-2 py-1 rounded-lg font-bold uppercase", notifFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}
                                                >
                                                    {t("dashboard.all")}
                                                </button>
                                            </div>
                                            <div className="max-h-72 overflow-y-auto space-y-2">
                                                {(notifFilter === "unread" ? notifications.filter((n) => !n.is_read) : notifications).length === 0 ? (
                                                    <p className="text-xs text-slate-400 py-4 text-center">{t("dashboard.no_notifications")}</p>
                                                ) : (notifFilter === "unread" ? notifications.filter((n) => !n.is_read) : notifications).map((n) => (
                                                    <button
                                                        key={n.id}
                                                        onClick={() => handleMarkOneRead(n.id)}
                                                        className={cn(
                                                            "w-full text-left rounded-xl border p-3",
                                                            n.is_read ? "border-slate-100 bg-slate-50/50" : "border-indigo-100 bg-indigo-50/60"
                                                        )}
                                                    >
                                                        <p className="text-xs font-bold text-slate-900">{n.title}</p>
                                                        <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-bold text-slate-900">{pathname.startsWith('/dashboard/admin') ? 'Admin' : t('dashboard.business_portal')}</p>
                                <button
                                    onClick={() => { if (business?.slug) window.location.href = `/p/${business.slug}`; }}
                                    className="text-xs font-extrabold text-primary uppercase tracking-wider hover:text-blue-600 transition-colors"
                                >
                                    {t('dashboard.view_public_page')}
                                </button>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                {pathname.startsWith('/dashboard/admin') ? 'AD' : (user?.full_name?.charAt(0) || business?.name?.charAt(0) || 'U')}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-background p-8">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
                {headerToast && (
                    <div className="fixed top-20 right-6 z-210 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl">
                        {headerToast}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
