"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    Sparkles,
    ClipboardList,
    LogOut,
    Shield,
    BadgeCheck
} from "lucide-react";

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Queue', href: '/dashboard/queue', icon: Users },
    { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
    { name: 'Services', href: '/dashboard/services', icon: Sparkles },
    { name: 'Reports', href: '/dashboard/reports', icon: ClipboardList },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const { user, business, logout } = useAuth();

    const isVerified = user?.status === 'active';

    return (
        <div className="flex h-full w-64 flex-col bg-white text-slate-600 border-r border-slate-200">
            <div className="flex h-20 shrink-0 items-center px-6">
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center mr-3 shadow-lg shadow-primary/30">
                    <span className="text-white font-black text-base">
                        {business?.name?.charAt(0) || 'Q'}
                    </span>
                </div>
                <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xl font-bold tracking-tight text-slate-900 truncate">
                            {business?.name || 'QueueUp'}
                        </span>
                        {isVerified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" fill="currentColor" fillOpacity={0.1} />
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isVerified ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {isVerified ? 'Verified Account' : 'Reviewing Profile'}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {/* Business Section */}
                {business && (
                    <div>
                        <div className="px-4 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Business Center
                            </span>
                        </div>
                        <div className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            "group flex items-center px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-primary text-white shadow-lg shadow-primary/20 translate-x-1"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "mr-3 h-5 w-5 shrink-0 transition-colors duration-200",
                                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                                        )} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Admin section */}
                {(user?.role === 'admin' || user?.user_metadata?.role === 'admin') && (
                    <div className="pt-2">
                        <div className="px-4 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Oversight
                            </span>
                        </div>
                        <Link
                            href="/dashboard/admin"
                            onClick={onClose}
                            className={cn(
                                "group flex items-center px-4 py-3 text-sm font-black uppercase tracking-tighter rounded-xl transition-all duration-200",
                                pathname === '/dashboard/admin'
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5"
                                    : "text-indigo-600 border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50"
                            )}
                        >
                            <Shield className="mr-3 h-5 w-5" />
                            Control Center
                        </Link>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={logout}
                    className="flex w-full items-center px-3 py-2 text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
