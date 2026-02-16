import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />

      <nav className="fixed top-0 z-50 w-full px-6 py-4 glass-panel border-b border-accent/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            <span className="text-xl font-bold tracking-tight">QueueUp</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary">
            <a href="#" className="hover:text-primary transition-colors">How it works</a>
            <a href="#" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#" className="hover:text-primary transition-colors">For Businesses</a>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-lg shadow-foreground/10 hover:bg-foreground/90 transition-all active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 pt-20">
        <section className="flex flex-col items-center text-center space-y-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            WhatsApp-first Queue Management
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
            No More <span className="text-primary italic">Waiting</span> <br /> In Line.
          </h1>

          <p className="text-lg md:text-xl text-secondary max-w-2xl leading-relaxed">
            Revolutionize your business with AI-powered live queue tracking and appointments.
            Real-time updates directly to your customers&apos; WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
            <Link
              href="/login"
              className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-1 transition-all"
            >
              Join a Queue
            </Link>
            <Link
              href="/login"
              className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-2xl bg-white border border-slate-200 px-8 py-4 text-lg font-bold text-foreground shadow-sm hover:bg-slate-50 transition-all font-bold"
            >
              Business Portal
            </Link>
          </div>
        </section>

        {/* Feature Preview Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 mb-16 w-full">
          {[
            { title: "Live Tracking", desc: "Customers track their position in real-time from anywhere.", icon: "⏱️" },
            { title: "Smart Scheduling", desc: "Automated appointment booking that fills gaps in your day.", icon: "📅" },
            { title: "WhatsApp Updates", desc: "Instant notifications sent straight to their favorite app.", icon: "💬" }
          ].map((feature, i) => (
            <div key={i} className="glass-panel p-8 rounded-3xl border border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-accent/20 bg-background/50 backdrop-blur-md py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Q</span>
            </div>
            <span className="font-semibold text-secondary">© 2026 QueueUp Inc.</span>
          </div>
          <div className="flex gap-8 text-sm text-secondary">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
