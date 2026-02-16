"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { business } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                    "fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition duration-200 ease-in-out",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <Sidebar onClose={() => setIsSidebarOpen(false)} />
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
                            <h2 className="text-[10px] md:text-xs font-extrabold text-slate-700 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
                                {business?.name || 'Dashboard'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-bold text-slate-900">Business Portal</p>
                                <button className="text-[10px] font-extrabold text-primary uppercase tracking-widest hover:text-primary-hover transition-colors">
                                    View Public Page
                                </button>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                {business?.name?.charAt(0) || 'AD'}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-background p-8">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
