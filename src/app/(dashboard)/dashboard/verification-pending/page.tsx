"use client";

import { useAuth } from "@/hooks/useAuth";
import { Clock, MessageCircle, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function VerificationPendingPage() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative mx-auto h-24 w-24">
                    <div className="absolute inset-0 bg-amber-100 rounded-[32px] rotate-6 scale-110" />
                    <div className="relative h-full w-full bg-white rounded-[32px] shadow-xl border border-amber-100 flex items-center justify-center text-amber-500">
                        <Clock className="h-10 w-10 animate-pulse" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verification Pending</h1>
                    <p className="text-slate-500 font-bold leading-relaxed">
                        Hi {user?.full_name || 'Owner'}, your business profile is currently under review by our team.
                    </p>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
                    <div className="flex items-start gap-4 text-left">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <ShieldAlert className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-sm font-bold text-slate-700">Checking documentation & contact details.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 text-left">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Next Steps</p>
                            <p className="text-sm font-bold text-slate-700">We will notify you via WhatsApp once your portal is active.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                    <Link
                        href="https://wa.me/91XXXXXXXXXX" 
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                        Contact Support
                    </Link>
                    <button
                        onClick={logout}
                        className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                    </button>
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Typical approval time: 2-4 hours
                </p>
            </div>
        </div>
    );
}
