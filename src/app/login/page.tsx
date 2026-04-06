"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

const REGIONS = [
    { code: "US", name: "United States", currency: "USD", timezone: "America/New_York", lang: "en", dial_code: "+1", phoneLimit: 10 },
    { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London", lang: "en", dial_code: "+44", phoneLimit: 10 },
    { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata", lang: "en", dial_code: "+91", phoneLimit: 10 },
    { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai", lang: "ar", dial_code: "+971", phoneLimit: 9 },
    { code: "ES", name: "Spain", currency: "EUR", timezone: "Europe/Madrid", lang: "es", dial_code: "+34", phoneLimit: 9 },
    { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney", lang: "en", dial_code: "+61", phoneLimit: 9 },
];

export default function LoginPage() {
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const { setLanguage } = useLanguage();
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [regionSettings, setRegionSettings] = useState<any>(null);
    const [resendTimer, setResendTimer] = useState(0);
    const router = useRouter();

    useEffect(() => {
        let timer: any;
        if (resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    /** Drop stale invite tokens unless we just came from /invite (installed PWAs keep localStorage a long time). */
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            if (sessionStorage.getItem("queueup_invite_flow") !== "1") {
                localStorage.removeItem("pending_invite_token");
            }
        } catch {
            /* private mode */
        }
    }, []);

    /**
     * Chrome/Android Web OTP API: reads OTP from SMS when the message includes an
     * origin-bound line (see Supabase phone template). Without that line in the SMS,
     * the OS may still suggest the code via autocomplete="one-time-code" — behavior varies.
     */
    useEffect(() => {
        if (step !== 2 || typeof window === "undefined") return;
        if (!("OTPCredential" in window)) return;

        const ac = new AbortController();
        const req = {
            otp: { transport: ["sms"] as const },
            signal: ac.signal
        } as Parameters<typeof navigator.credentials.get>[0];

        navigator.credentials
            .get(req)
            .then((cred) => {
                const code = cred && "code" in cred ? (cred as { code?: string }).code : undefined;
                if (code) {
                    const digits = String(code).replace(/\D/g, "").slice(0, 6);
                    if (digits.length === 6) setOtp(digits);
                }
            })
            .catch(() => {
                /* No SMS match, permission denied, or unsupported — expected on many devices */
            });

        return () => ac.abort();
    }, [step]);

    useEffect(() => {
        let currentRegion = REGIONS.find(r => r.code === "IN");
        try {
            const settings = localStorage.getItem('app_region_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                const matched = REGIONS.find(r => r.code === parsed.code);
                if (matched) currentRegion = matched;
            }

            const lastPhone = localStorage.getItem('last_login_phone');
            if (lastPhone) setPhone(lastPhone);
        } catch (e) { }

        setRegionSettings(currentRegion);
        if (currentRegion) {
            localStorage.setItem('app_region_settings', JSON.stringify(currentRegion));
        }
        // Login page should stay English-only.
        setLanguage('en', true).catch(() => { });
    }, []);

    const handleSendOTP = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent, isResend = false) => {
        if (e && e.preventDefault) e.preventDefault();

        if (loading || (isResend && resendTimer > 0)) return;

        setLoading(true);
        setError("");

        try {
            const dialCode = regionSettings?.dial_code || '+91';
            const formattedPhone = phone.startsWith('+') ? phone : `${dialCode}${phone}`;
            await authService.sendOTP(formattedPhone);
            setStep(2);
            setResendTimer(60); // Start 60s countdown
            localStorage.setItem('last_login_phone', phone);
        } catch (err: any) {
            setError(maskTechnicalError(err.message) || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const maskTechnicalError = (message: string) => {
        if (!message) return null;
        const technicalKeywords = [
            'schema', 'column', 'database', 'supabase', 'postgrest', 
            'cache', 'relation', 'table', 'trigger', 'procedure',
            '500', 'internal server error', 'undefined'
        ];
        
        const isTechnical = technicalKeywords.some(kw => message.toLowerCase().includes(kw));
        
        if (isTechnical) {
            return "Service configuration error. Please try again later or contact support.";
        }
        
        return message;
    };

    const handleVerifyOTP = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        if (loading) return;

        setLoading(true);
        setError("");

        try {
            const dialCode = regionSettings?.dial_code || '+91';
            const formattedPhone = phone.startsWith('+') ? phone : `${dialCode}${phone}`;
            const response = await authService.verifyOTP(formattedPhone, otp);

            if (response.data?.user && response.data?.session?.access_token) {
                const userObj = response.data.user;
                const isNewUser = response.data.is_new_user;

                userObj.ui_language = 'en';
                await login(userObj, response.data.session.access_token, isNewUser);
                await setLanguage('en', true);
            } else {
                throw new Error("Invalid session data received");
            }
        } catch (err: any) {
            setError(maskTechnicalError(err.message) || "Invalid OTP. Please check and try again.");
        } finally {
            setLoading(false);
        }
    };

    const phoneLimit = regionSettings?.phoneLimit || 10;
    const isPhoneValid = phone.length === phoneLimit;

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
                        <div
                            className="space-y-6"
                            onKeyDown={(e) => { if (e.key === 'Enter' && isPhoneValid) handleSendOTP(e); }}
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Phone Number</label>
                                <div className="flex bg-slate-50 rounded-2xl items-center focus-within:ring-2 focus-within:ring-primary/20 transition-all border border-transparent">
                                    <div className="relative border-r border-slate-200">
                                        <select
                                            value={regionSettings?.dial_code || "+91"}
                                            onChange={(e) => {
                                                const region = REGIONS.find(r => r.dial_code === e.target.value);
                                                if (region) {
                                                    setRegionSettings(region);
                                                    setPhone(""); // Clear phone on region change to enforce limits
                                                    localStorage.setItem('app_region_settings', JSON.stringify(region));
                                                }
                                            }}
                                            className="appearance-none bg-transparent pl-4 pr-8 py-4 text-lg font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            {REGIONS.map(r => (
                                                <option key={r.code} value={r.dial_code}>
                                                    {r.code} ({r.dial_code})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        autoComplete="tel"
                                        autoFocus={step === 1}
                                        required
                                        maxLength={phoneLimit}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, phoneLimit))}
                                        placeholder={phoneLimit === 9 ? "50 123 4567" : "99887 76655"}
                                        className="w-full px-4 py-4 bg-transparent border-none text-lg font-medium outline-none"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">
                                    {regionSettings?.name} ({phoneLimit} Digits)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={loading || !isPhoneValid}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <>Send OTP <ArrowRight className="ml-2 h-5 w-5" /></>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div
                            className="space-y-6"
                            onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 6) handleVerifyOTP(e); }}
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">Verification Code</label>
                                <input
                                    type="text"
                                    name="otp"
                                    id="otp"
                                    required
                                    autoFocus
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-center text-3xl font-black tracking-[0.5em] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                                <div className="flex flex-col items-center gap-4 pt-2">
                                    <p className="text-center text-xs text-secondary">
                                        Code sent to {regionSettings?.dial_code || "+91"} {phone}.{" "}
                                        <button type="button" onClick={() => setStep(1)} className="text-primary font-bold">
                                            Edit
                                        </button>
                                    </p>
                                    
                                    <button 
                                        type="button"
                                        disabled={resendTimer > 0 || loading}
                                        onClick={(e) => handleSendOTP(e, true)}
                                        className="text-[11px] font-black uppercase tracking-widest text-primary disabled:opacity-40"
                                    >
                                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleVerifyOTP}
                                disabled={loading || otp.length < 6}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify & Login"}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
