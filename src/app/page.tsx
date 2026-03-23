"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Smartphone,
  Calendar,
  MessageCircle
} from "lucide-react";

export default function LandingPage() {
  const [stats, setStats] = useState({ totalUsers: 500, totalBusinesses: 50 });

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/platform-stats`);
            const result = await response.json();
            if (result.status === 'success') {
                setStats(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch platform stats:", error);
        }
    };
    fetchStats();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#fafbfc] selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full px-6 py-5 backdrop-blur-xl border-b border-slate-200/50 bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:rotate-3">
              <span className="text-white font-black text-xl leading-none">Q</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">QueueUp</span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-40 md:pt-48">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-7xl px-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
                <ShieldCheck className="h-3.5 w-3.5" />
                Premium Queue Management
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 leading-[1.05] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                Professional Queues, <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600 italic">Redefined.</span>
            </h1>

            <p className="text-lg md:text-2xl text-slate-500 max-w-2xl leading-relaxed font-bold mb-14 animate-in fade-in slide-in-from-bottom-8 duration-900">
                A sleek, WhatsApp-integrated live queue system designed for modern salons, clinics, and retail spaces.
            </p>

            <div className="flex flex-col items-center gap-8 w-full mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center rounded-[24px] bg-primary px-14 py-6 text-xl font-black text-white shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-1 transition-all active:scale-95"
              >
                Launch Your Portal
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100/50 whitespace-nowrap rounded-2xl border border-slate-200/50">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
                          Trusted by {stats.totalBusinesses}+ Businesses & {stats.totalUsers}+ Users
                      </span>
                  </div>
              </div>
            </div>

            {/* SPACER FOR CLEAN LOOK */}
            <div className="pb-20" />
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 md:py-32 bg-white border-y border-slate-100">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Simple Implementation.</h2>
                    <p className="text-slate-500 font-bold text-lg">Transition your business in three simple steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                        { 
                          title: "Register Profile", 
                          icon: <Smartphone className="h-6 w-6" />,
                          desc: "Enter your business details and launch your portal in seconds." 
                        },
                        { 
                          title: "Share Access", 
                          icon: <Calendar className="h-6 w-6" />,
                          desc: "Direct link or QR code — give your customers the freedom to track their place." 
                        },
                        { 
                          title: "Automate Workflow", 
                          icon: <MessageCircle className="h-6 w-6" />,
                          desc: "WhatsApp alerts handle the communication. You focus on your craft." 
                        }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center text-center p-8 rounded-[32px] hover:bg-slate-50 transition-colors group">
                            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                {item.icon}
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{item.title}</h4>
                            <p className="text-slate-500 font-bold leading-relaxed text-sm">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <div className="relative p-12 md:p-24 bg-slate-900 rounded-[48px] md:rounded-[64px] shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/10 blur-[150px] -z-0" />
                <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                    <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">Ready for better <br /> Business?</h2>
                    <Link href="/login" className="px-14 py-6 bg-primary text-white rounded-[24px] text-lg font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                        Get Professional Now
                    </Link>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No setup fees • Instant Activation</p>
                </div>
            </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-16 px-6 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm">Q</div>
                <span className="text-xl font-black tracking-tight text-slate-900">QueueUp</span>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">© 2026 QueueUp Technologies Ltd.</p>
            <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <a href="mailto:support@queueup.com" className="hover:text-primary transition-colors">Support</a>
                <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
        </div>
      </footer>
    </div>
  );
}
