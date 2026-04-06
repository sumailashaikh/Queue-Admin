"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ShieldCheck,
    Smartphone,
    Calendar,
    MessageCircle,
    Users,
    BarChart3,
    Clock
} from "lucide-react";

export default function LandingPage() {
    const [stats, setStats] = useState({ totalUsers: 500, totalBusinesses: 50 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const response = await fetch(`${base}/platform-stats`);
                const result = await response.json();
                if (result.status === "success") {
                    setStats(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch platform stats:", error);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-slate-50 selection:bg-primary/15">
            <div
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]"
                aria-hidden
            />

            <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur-md md:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
                            <span className="text-lg font-bold leading-none text-white">Q</span>
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-slate-900">QueueUp</span>
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
                    >
                        Sign in
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-28 md:pt-36">
                <section className="mx-auto max-w-6xl px-5 pb-20 text-center md:px-8 md:pb-28">
                    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-600 shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        Queue & appointments for service businesses
                    </p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl md:leading-[1.1]">
                        Calm front desk. Clear wait times. Happy customers.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                        QueueUp helps salons, clinics, and retail teams run a live queue, book appointments, and notify
                        guests by SMS and WhatsApp—without the chaos.
                    </p>
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                        >
                            Sign in to your business
                            <ArrowRight className="h-5 w-5" strokeWidth={2} />
                        </Link>
                        <p className="text-sm text-slate-500">
                            Already registered? Use the phone number linked to your account.
                        </p>
                    </div>
                    <p className="mt-12 text-xs font-medium text-slate-500">
                        Used by{" "}
                        <span className="font-semibold text-slate-700">{stats.totalBusinesses}+</span> businesses ·{" "}
                        <span className="font-semibold text-slate-700">{stats.totalUsers}+</span> active users
                    </p>
                </section>

                <section className="border-y border-slate-200/80 bg-white py-20 md:py-24">
                    <div className="mx-auto max-w-6xl px-5 md:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                                Everything in one flow
                            </h2>
                            <p className="mt-3 text-slate-600">
                                From walk-ins to scheduled visits, your team stays aligned.
                            </p>
                        </div>
                        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    title: "Live queue",
                                    desc: "Guests join from your link or QR; you see who is waiting and who is being served.",
                                    icon: Users
                                },
                                {
                                    title: "Appointments",
                                    desc: "Offer time slots that respect your hours and service duration.",
                                    icon: Calendar
                                },
                                {
                                    title: "Notifications",
                                    desc: "SMS and WhatsApp nudges so customers know when it is their turn.",
                                    icon: MessageCircle
                                },
                                {
                                    title: "Insights",
                                    desc: "Track volume and performance so you can staff with confidence.",
                                    icon: BarChart3
                                }
                            ].map(({ title, desc, icon: Icon }) => (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
                                >
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-slate-100">
                                        <Icon className="h-5 w-5" strokeWidth={2} />
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Clock className="h-6 w-6" strokeWidth={2} />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                            Get started in minutes
                        </h2>
                        <p className="mt-3 text-slate-600">No hardware required—works in the browser on phone, tablet, or desktop.</p>
                    </div>
                    <div className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-3 md:gap-8">
                        {[
                            {
                                step: "1",
                                title: "Create your business",
                                desc: "Add your name, hours, and services so the public page matches your brand.",
                                icon: Smartphone
                            },
                            {
                                step: "2",
                                title: "Share your link",
                                desc: "Post your QueueUp URL or QR where customers already look—Instagram, Google, or in-store.",
                                icon: Calendar
                            },
                            {
                                step: "3",
                                title: "Run the day",
                                desc: "Staff use one dashboard for queue, appointments, and provider assignments.",
                                icon: MessageCircle
                            }
                        ].map((item) => (
                            <div key={item.step} className="relative text-center md:text-left">
                                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                    {item.step}
                                </span>
                                <div className="mb-3 inline-flex md:block">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 md:mx-0">
                                        <item.icon className="h-5 w-5" strokeWidth={2} />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8 md:pb-32">
                    <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center shadow-xl md:px-16 md:py-20">
                        <div
                            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
                            aria-hidden
                        />
                        <h2 className="relative text-2xl font-semibold text-white md:text-4xl md:leading-tight">
                            Ready to streamline your front desk?
                        </h2>
                        <p className="relative mx-auto mt-4 max-w-lg text-sm text-slate-400 md:text-base">
                            Sign in with your business phone to open your dashboard.
                        </p>
                        <Link
                            href="/login"
                            className="relative mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-10 py-4 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-95 active:scale-[0.98]"
                        >
                            Sign in
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-center md:flex-row md:px-8 md:text-left">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                            Q
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">QueueUp</p>
                            <p className="text-xs text-slate-500">Smart queue & booking for service businesses</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} QueueUp. All rights reserved.</p>
                    <Link
                        href="/login"
                        className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-primary hover:underline"
                    >
                        Business sign in
                    </Link>
                </div>
            </footer>
        </div>
    );
}
