import Link from "next/link";
import Image from "next/image";
import { 
  BarChart3, 
  Smartphone, 
  Store, 
  Clock, 
  Calendar, 
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  CheckCircle2,
  ChevronDown,
  Play
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#fafbfc] selection:bg-primary/20">
      {/* Dynamic Background */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full px-6 py-5 backdrop-blur-xl border-b border-slate-200/50 bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:rotate-3">
              <span className="text-white font-black text-xl leading-none">Q</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">QueueUp</span>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-500">
               <a href="#features" className="hover:text-primary transition-colors">Features</a>
               <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
               <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </div>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-7xl px-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trusted by 500+ Businesses Worldwide
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 leading-[1.05] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                Revolutionize Your <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600 italic">Queue Experience</span>
            </h1>

            <p className="text-lg md:text-2xl text-slate-500 max-w-3xl leading-relaxed font-bold mb-12 animate-in fade-in slide-in-from-bottom-8 duration-900">
                Empower your salon, clinic, or retail shop with a WhatsApp-integrated live queue. 
                Reduce perceived wait time by 40%.
            </p>

            <div className="flex flex-col items-center gap-5 w-full mb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center rounded-[24px] bg-primary px-12 py-6 text-xl font-black text-white shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-1 transition-all active:scale-95"
              >
                Get Started for Free
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Instant Setup</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp Ready</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No Credit Card</span>
              </div>
            </div>

            {/* PRODUCT PREVIEW */}
            <div className="relative w-full max-w-5xl group mx-auto animate-in zoom-in-95 duration-1000 pb-20">
                <div className="absolute inset-0 bg-primary/10 blur-[80px] -z-10 rounded-full opacity-50' " />
                <div className="relative rounded-[40px] border-[12px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden aspect-[16/10]">
                    {/* Embedded Mockup Placeholder */}
                    <Image 
                        src="/dashboard_mockup.png"
                        alt="QueueUp Dashboard Mockup"
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <button className="absolute inset-0 m-auto h-20 w-20 bg-white shadow-2xl rounded-full flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all">
                        <Play className="h-8 w-8 fill-current ml-1" />
                    </button>
                </div>
            </div>
        </section>

        {/* LOGO CLOUD / TRUST */}
        <section className="bg-white py-16 border-y border-slate-100 mb-20">
            <div className="mx-auto max-w-7xl px-6 text-center space-y-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Trusted by modern businesses locally</p>
                <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-40 grayscale contrast-125">
                    {['Salon Bloom', 'Elite Dental', 'Urban Clinic', 'Spark Gym', 'The Hub'].map((name) => (
                        <span key={name} className="text-xl font-black text-slate-900 tracking-tighter">{name.toUpperCase()}</span>
                    ))}
                </div>
            </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-24">
            <div className="flex flex-col items-center text-center space-y-4 mb-20">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">Powerful Tools. Pure Simplicity.</h2>
                <p className="text-slate-500 font-bold max-w-2xl text-lg">We&apos;ve built everything you need to manage a high-traffic business without the chaos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { 
                        title: "Live Tracking", 
                        desc: "Customers get a real-time link on WhatsApp to track their token status from anywhere.", 
                        icon: <Smartphone className="h-7 w-7" />,
                        color: "bg-blue-50 text-blue-600"
                    },
                    { 
                        title: "Smart Appointments", 
                        desc: "Let clients book online. Our AI automatically syncs them with the live walk-in queue.", 
                        icon: <Calendar className="h-7 w-7" />,
                        color: "bg-indigo-50 text-indigo-600"
                    },
                    { 
                        title: "WhatsApp Alerts", 
                        desc: "Automatic notifications for Check-in, Ready Turn, and Delay alerts sent instantly.", 
                        icon: <MessageCircle className="h-7 w-7" />,
                        color: "bg-emerald-50 text-emerald-600"
                    },
                    { 
                        title: "Owner Analytics", 
                        desc: "Track average wait times, busy hours, and staff performance with easy dashboards.", 
                        icon: <BarChart3 className="h-7 w-7" />,
                        color: "bg-amber-50 text-amber-600"
                    },
                    { 
                        title: "TV Mode", 
                        desc: "Display your live queue on a large screen in your lobby for transparency.", 
                        icon: <Store className="h-7 w-7" />,
                        color: "bg-rose-50 text-rose-600"
                    },
                    { 
                        title: "Zero Setup", 
                        desc: "Auto-creates your queue as you go. No complex configuration, just start serving.", 
                        icon: <Zap className="h-7 w-7" />,
                        color: "bg-violet-50 text-violet-600"
                    }
                ].map((f, i) => (
                    <div key={i} className="group p-10 bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                        <div className={`h-16 w-16 rounded-[24px] ${f.color} flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform`}>
                            {f.icon}
                        </div>
                        <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-32 bg-slate-900 border-y border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/20 blur-[150px] opacity-20 -z-0" />
            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-16 mb-24">
                    <div className="max-w-2xl space-y-6">
                        <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">Your Queue, <br /> On Autopilot.</h2>
                        <p className="text-slate-400 font-bold text-xl leading-relaxed">Three simple steps to transition your business into the digital age.</p>
                    </div>
                    <Link href="/login" className="px-10 py-5 bg-white text-slate-900 rounded-[32px] text-lg font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-2xl">
                        Join QueueUp Today
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                        { step: "01", title: "Create Profile", desc: "Signup with your number. No complicated KYC or setup docs." },
                        { step: "02", title: "Share QR", desc: "Customers scan a QR in your shop or click a link on social media." },
                        { step: "03", title: "Relax", desc: "Notification systems & live tracking do the talking for you." }
                    ].map((item, i) => (
                        <div key={i} className="p-8 rounded-[40px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 block">Step {item.step}</span>
                            <h4 className="text-2xl font-black text-white mb-3">{item.title}</h4>
                            <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto max-w-7xl px-6 py-32">
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">Loved by Owners.</h2>
                <div className="flex items-center justify-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { name: "Rahul S.", role: "Salon Owner", text: "Queue management used to be my biggest headache. With QueueUp, my customers wait in their cars or nearby shops instead of crowding my entrance. Pure magic." },
                    { name: "Dr. Anjali M.", role: "Clinic Director", text: "The WhatsApp integration is what won me over. Patients love the live tracking link. It makes my reception desks job 50% easier." },
                    { name: "Vikram K.", role: "Retail Manager", text: "We saw a 20% increase in revenue because customers now shop while they wait instead of walking away from a long physical line." }
                ].map((t, i) => (
                    <div key={i} className="p-10 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <p className="text-slate-600 font-bold text-lg leading-relaxed mb-10">&quot;{t.text}&quot;</p>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase">{t.name[0]}</div>
                            <div>
                                <h5 className="font-black text-slate-900">{t.name}</h5>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.role}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="mx-auto max-w-4xl px-6 py-32 border-t border-slate-100">
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight text-center mb-20">Frequently Asked</h2>
             <div className="space-y-4">
                 {[
                     { q: "Is it free for new businesses?", a: "Yes, we are currently in BETA. You can explore all premium features for free while we scale." },
                     { q: "Do customers need to install an app?", a: "No! Customers simply open a tiny web link directly from their WhatsApp or by scanning a QR. No installs, no friction." },
                     { q: "How much does WhatsApp notification cost?", a: "We use standard WhatsApp business pricing, but for the first 1000 messages every month, it's completely on us." },
                     { q: "How long is the setup process?", a: "If you have your service list ready, you can go live in less than 5 minutes." }
                 ].map((item, i) => (
                    <div key={i} className="group p-8 bg-white rounded-[32px] border border-slate-100 hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between gap-4">
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{item.q}</h4>
                        </div>
                        <p className="mt-4 text-slate-500 font-bold leading-relaxed">{item.a}</p>
                    </div>
                 ))}
             </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-32">
            <div className="p-12 md:p-24 bg-primary rounded-[56px] shadow-2xl shadow-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[40%] h-full bg-white/10 blur-[100px] -z-0 group-hover:bg-white/20 transition-all duration-1000" />
                <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                    <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">Ready to digitize <br /> your shop?</h2>
                    <p className="text-primary-foreground/80 font-bold text-xl max-w-xl">Join hundreds of businesses making their customers happy by ending wait-lines.</p>
                    <div className="flex flex-col items-center gap-4">
                        <Link href="/login" className="px-12 py-6 bg-white text-primary rounded-[32px] text-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                            Go Professional Now
                        </Link>
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Setup in 5 minutes • No credit card</p>
                    </div>
                </div>
            </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white py-20 px-6 border-t border-slate-100">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-white">Q</div>
                    <span className="text-2xl font-black tracking-tight">QueueUp</span>
                </div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">© 2026 QueueUp Technologies Ltd.</p>
            </div>
            <div className="flex items-center gap-12 text-sm font-black text-slate-400 uppercase tracking-widest">
                <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
                <a href="mailto:support@queueup.com" className="hover:text-primary transition-colors underline underline-offset-8">Support</a>
            </div>
        </div>
      </footer>
    </div>
  );
}
