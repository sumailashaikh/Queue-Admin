"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";

const REGIONS = [
    { code: "US", name: "United States", currency: "USD", timezone: "America/New_York", lang: "en", dial_code: "+1" },
    { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London", lang: "en", dial_code: "+44" },
    { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata", lang: "en", dial_code: "+91" },
    { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai", lang: "ar", dial_code: "+971" },
    { code: "ES", name: "Spain", currency: "EUR", timezone: "Europe/Madrid", lang: "es", dial_code: "+34" },
    { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney", lang: "en", dial_code: "+61" },
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
    const router = useRouter();

    useEffect(() => {
        let currentRegion = REGIONS.find(r => r.code === "IN");
        try {
            const settings = localStorage.getItem('app_region_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                const matched = REGIONS.find(r => r.code === parsed.code);
                if (matched) currentRegion = matched;
            }
        } catch (e) { }

        setRegionSettings(currentRegion);
        // Sync the fresh structure back to storage just in case
        if (currentRegion) {
            localStorage.setItem('app_region_settings', JSON.stringify(currentRegion));
        }
    }, []);

    const handleSendOTP = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        if (loading) return; // Prevent double clicks

        setLoading(true);
        setError("");

        try {
            const dialCode = regionSettings?.dial_code || '+91';
            const formattedPhone = phone.startsWith('+') ? phone : `${dialCode}${phone}`;
            console.log(`[OTP] Sending OTP to ${formattedPhone}...`);
            await authService.sendOTP(formattedPhone);
            setStep(2);
        } catch (err: any) {
            console.error("[OTP] Send Failed: ", err);
            setError(err.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (loading) return; // Prevent double clicks

        setLoading(true);
        setError("");

        try {
            const dialCode = regionSettings?.dial_code || '+91';
            const formattedPhone = phone.startsWith('+') ? phone : `${dialCode}${phone}`;
            console.log(`[OTP] Attempting to verify OTP for ${formattedPhone}...`);
            const response = await authService.verifyOTP(formattedPhone, otp);

            if (response.data?.user && response.data?.session?.access_token) {
                console.log(`[OTP] Verification successful. Proceeding to login...`);
                const userObj = response.data.user;
                const isNewUser = response.data.is_new_user;

                if (regionSettings?.language) {
                    userObj.ui_language = regionSettings.language;
                }
                await login(userObj, response.data.session.access_token, isNewUser);
                if (regionSettings?.language) {
                    await setLanguage(regionSettings.language, true);
                }
                // Redirection is handled internally by the login context/hook.
            } else {
                console.error("[OTP] Verification succeeded but session data was missing/invalid in response.", response);
                throw new Error("Invalid session data received");
            }
        } catch (err: any) {
            console.error("[OTP] Verification Failed: ", err);
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
                    <h1 className="text-3xl font-extrabold tracking-tight">{regionSettings ? i18n.t(regionSettings.language, 'login.title') : 'Business Login'}</h1>
                    <p className="text-secondary text-sm px-8">
                        {regionSettings ? i18n.t(regionSettings.language, 'login.subtitle') : 'Manage your live queue and appointments. Enter your phone number to continue.'}
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
                            onKeyDown={(e) => { if (e.key === 'Enter' && phone.length >= 10) handleSendOTP(e); }}
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{regionSettings ? i18n.t(regionSettings.language, 'login.phone_lbl') : 'Phone Number'}</label>
                                <div className="flex bg-slate-50 rounded-2xl items-center focus-within:ring-2 focus-within:ring-primary/20 transition-all border border-transparent">
                                    <div className="relative border-r border-slate-200">
                                        <select
                                            value={regionSettings?.dial_code || "+91"}
                                            onChange={(e) => {
                                                const region = REGIONS.find(r => r.dial_code === e.target.value);
                                                if (region) {
                                                    setRegionSettings(region);
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
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="99887 76655"
                                        className="w-full px-4 py-4 bg-transparent border-none text-lg font-medium outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={loading || phone.length < 10}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                    <>{regionSettings ? i18n.t(regionSettings.language, 'login.send_otp') : 'Send OTP'} <ArrowRight className="ml-2 h-5 w-5" /></>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div
                            className="space-y-6"
                            onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 6) handleVerifyOTP(e); }}
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{regionSettings ? i18n.t(regionSettings.language, 'login.verify_lbl') : 'Verification Code'}</label>
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
                                    {regionSettings ? i18n.t(regionSettings.language, 'login.code_sent') : 'Code sent to'} {regionSettings?.dial_code || "+91"} {phone}. <button type="button" onClick={() => setStep(1)} className="text-primary font-bold">Edit</button>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleVerifyOTP}
                                disabled={loading || otp.length < 6}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (regionSettings ? i18n.t(regionSettings.language, 'login.verify_btn') : "Verify & Login")}
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-secondary">
                    By logging in, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}
