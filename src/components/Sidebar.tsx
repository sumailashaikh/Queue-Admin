"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    Sparkles,
    ClipboardList,
    LogOut,
    Shield,
    BadgeCheck,
    Briefcase,
    TrendingUp
} from "lucide-react";

const navigation = [
    { transKey: 'sidebar.overview', href: '/dashboard', icon: LayoutDashboard },
    { transKey: 'sidebar.live_queue', href: '/dashboard/queue', icon: Users },
    { transKey: 'sidebar.providers', href: '/dashboard/providers', icon: Briefcase },
    { transKey: 'sidebar.expert_analytics', href: '/dashboard/provider-analytics', icon: TrendingUp },
    { transKey: 'sidebar.appointments', href: '/dashboard/appointments', icon: Calendar },
    { transKey: 'sidebar.services', href: '/dashboard/services', icon: Sparkles },
    { transKey: 'sidebar.settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ onClose, isCollapsed = false, forceLanguage }: { onClose?: () => void, isCollapsed?: boolean, forceLanguage?: string }) {
    const pathname = usePathname();
    const { user, business, logout } = useAuth();
    const { t: baseT } = useLanguage();
    const t = (key: string, params?: any) => baseT(key, params, forceLanguage);

    const isVerified = user?.status === 'active';

    return (
        <div className={cn(
            "flex h-full flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn(
                "flex h-20 shrink-0 items-center border-b border-slate-800/50 transition-all",
                isCollapsed ? "px-4 justify-center" : "px-6"
            )}>
                <div className={cn(
                    "h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-all",
                    !isCollapsed && "mr-3"
                )}>
                    <span className="text-white font-black text-base">
                        {pathname.startsWith('/dashboard/admin') ? 'P' : (business?.name?.charAt(0) || 'Q')}
                    </span>
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col truncate animate-in fade-in duration-300">
                        <div className="flex items-center gap-1 min-w-0">
                            <span className="text-lg font-black tracking-tight text-white truncate">
                                {pathname.startsWith('/dashboard/admin') ? 'Admin Dashboard' : (business?.name || 'QueueUp')}
                            </span>
                            {isVerified && (
                                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" fill="currentColor" fillOpacity={0.1} />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isVerified ? "bg-emerald-500" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                            )} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {isVerified ? t('sidebar.verified') : t('sidebar.reviewing')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {/* Business Section */}
                {business && user?.role !== 'admin' && (
                    <div>
                        {!isCollapsed && (
                            <div className="px-4 mb-3 mt-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                    {t('sidebar.business_center')}
                                </span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        title={isCollapsed ? t(item.transKey) : undefined}
                                        className={cn(
                                            "group flex items-center rounded-[14px] transition-all duration-200",
                                            isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3 text-[13px] font-bold",
                                            isActive
                                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-4 w-4 shrink-0 transition-colors duration-200",
                                            !isCollapsed && "mr-3",
                                            isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                                        )} />
                                        {!isCollapsed && t(item.transKey)}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Admin section */}
                {(user?.role === 'admin' || user?.user_metadata?.role === 'admin') && (
                    <div className="pt-2">
                        {!isCollapsed && (
                            <div className="px-4 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                    <Shield className="h-3 w-3" />
                                    {t('sidebar.oversight')}
                                </span>
                            </div>
                        )}
                        <Link
                            href="/dashboard/admin"
                            onClick={onClose}
                            title={isCollapsed ? t('sidebar.control_center') : undefined}
                            className={cn(
                                "group flex items-center rounded-xl transition-all duration-200",
                                isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3 text-sm font-black uppercase tracking-tighter",
                                pathname === '/dashboard/admin'
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5"
                                    : "text-indigo-600 border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50"
                            )}
                        >
                            <Shield className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                            {!isCollapsed && t('sidebar.control_center')}
                        </Link>
                    </div>
                )}
            </nav>

            <div className={cn("p-4 border-t border-slate-800/50", isCollapsed && "flex justify-center")}>
                <button
                    onClick={logout}
                    title={isCollapsed ? t('sidebar.logout') : undefined}
                    className={cn(
                        "flex items-center text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-[14px] transition-all",
                        isCollapsed ? "p-3 justify-center" : "w-full px-4 py-3"
                    )}
                >
                    <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                    {!isCollapsed && t('sidebar.logout')}
                </button>
            </div>
        </div>
    );
}
