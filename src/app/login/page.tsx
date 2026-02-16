"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, authLoading, router]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
            await authService.sendOTP(formattedPhone);
            setStep(2);
        } catch (err: any) {
            setError(err.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
            const response = await authService.verifyOTP(formattedPhone, otp);

            if (response.data?.user && response.data?.session?.access_token) {
                await login(response.data.user, response.data.session.access_token);
            } else {
                throw new Error("Invalid session data received");
            }
        } catch (err: any) {
            setError(err.message || "Invalid OTP. Please check and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-24">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 mb-2">
                        <span className="text-white font-bold text-xl">Q</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Business Login</h1>
                    <p className="text-secondary text-sm px-8">
                        Manage your live queue and appointments. Enter your phone number to continue.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <div className="glass-panel p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-accent/10 shadow-sm bg-white">
                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-accent/20 pr-3">
                                        <span className="text-sm font-bold">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="99887 76655"
                                        className="w-full pl-16 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-lg font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || phone.length < 10}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <>Send OTP <ArrowRight className="ml-2 h-5 w-5" /></>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Verification Code</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="000000"
                                    className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-center text-3xl font-black tracking-[0.5em] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                                <p className="text-center text-xs text-secondary pt-2">
                                    Code sent to +91 {phone}. <button type="button" onClick={() => setStep(1)} className="text-primary font-bold">Edit</button>
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify & Login"}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-secondary">
                    By logging in, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}
