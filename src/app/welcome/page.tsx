"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowRight, MapPin, DollarSign, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const REGIONS = [
    { code: "US", name: "United States", currency: "USD", timezone: "America/New_York", lang: "en", dial_code: "+1" },
    { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London", lang: "en", dial_code: "+44" },
    { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata", lang: "hi", dial_code: "+91" },
    { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai", lang: "ar", dial_code: "+971" },
    { code: "ES", name: "Spain", currency: "EUR", timezone: "Europe/Madrid", lang: "es", dial_code: "+34" },
    { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney", lang: "en", dial_code: "+61" },
];

export default function WelcomePage() {
    const router = useRouter();
    const { isAuthenticated, logout, loading: authLoading } = useAuth();
    const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);

    useEffect(() => {
        // Smartly detect region on mount
        try {
            const browserLocale = navigator.language; // e.g., 'en-US' or 'es-ES'
            if (browserLocale) {
                const countryPart = browserLocale.split('-')[1]; // 'US' or 'ES'
                if (countryPart) {
                    const found = REGIONS.find(r => r.code === countryPart);
                    if (found) setSelectedRegion(found);
                }
            }
        } catch (e) {
            // suppress
        }
    }, []);

    const handleContinue = () => {
        localStorage.setItem('app_region_settings', JSON.stringify({
            country: selectedRegion.code,
            currency: selectedRegion.currency,
            timezone: selectedRegion.timezone,
            language: selectedRegion.lang,
            dial_code: selectedRegion.dial_code
        }));
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 pb-24 font-sans">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-16 w-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-2 transform rotate-3">
                        <Globe className="h-8 w-8 text-white -rotate-3" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Choose Your Region</h1>
                    <p className="text-slate-500 text-sm px-4 font-medium leading-relaxed">
                        We'll customize your experience, currency, and language based on your location.
                    </p>
                </div>

                {!authLoading && isAuthenticated && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-indigo-900">You are already logged in!</span>
                            <span className="text-xs font-medium text-indigo-600/70">Logout to test as a new user.</span>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Logout
                        </button>
                    </div>
                )}

                <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto p-2 no-scrollbar">
                        {REGIONS.map((region) => {
                            const isSelected = selectedRegion.code === region.code;
                            return (
                                <button
                                    key={region.code}
                                    onClick={() => setSelectedRegion(region)}
                                    className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 border-2 ${isSelected
                                        ? "border-indigo-600 bg-indigo-50/50"
                                        : "border-transparent hover:bg-slate-50"
                                        }`}
                                >
                                    <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 text-slate-500'}`}>
                                        {region.code}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{region.name}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {region.currency}</span>
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {region.lang}</span>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600' : 'border-slate-200'}`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                    Continue to Login <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
