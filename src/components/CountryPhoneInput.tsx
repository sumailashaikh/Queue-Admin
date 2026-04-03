"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
    digits: number;
}

export const COUNTRIES: Country[] = [
    { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", digits: 10 },
    { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪", digits: 9 },
    { code: "US", name: "USA", dialCode: "+1", flag: "🇺🇸", digits: 10 },
    { code: "GB", name: "UK", dialCode: "+44", flag: "🇬🇧", digits: 10 },
    { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", digits: 9 },
    { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", digits: 9 },
];

interface CountryPhoneInputProps {
    value: string; // Full number including dial code, e.g. "+919876543210"
    onChange: (fullNumber: string) => void;
    className?: string;
    placeholder?: string;
    required?: boolean;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
    value,
    onChange,
    className,
    placeholder = "Phone number",
    required = false
}) => {
    const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
    const [localNumber, setLocalNumber] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    // Keep local UI in sync when parent value changes (modal reset, edit load, etc.)
    useEffect(() => {
        const v = String(value || "").trim();
        if (!v) {
            setLocalNumber("");
            return;
        }
        const matchingCountry = COUNTRIES.find((c) => v.startsWith(c.dialCode));
        if (matchingCountry) {
            setSelectedCountry(matchingCountry);
            setLocalNumber(
                v
                    .replace(matchingCountry.dialCode, "")
                    .replace(/\D/g, "")
                    .slice(0, matchingCountry.digits)
            );
        }
    }, [value]);

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        // Recalculate full number with same local part but new dial code
        onChange(`${country.dialCode}${localNumber}`);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ""); // Only digits
        const limitedVal = val.slice(0, selectedCountry.digits);
        setLocalNumber(limitedVal);
        onChange(`${selectedCountry.dialCode}${limitedVal}`);
    };

    return (
        <div className={cn("relative flex items-center gap-2", className)}>
            {/* Country Selector */}
            <div className="relative shrink-0">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary/30 transition-all min-w-[100px] justify-between"
                >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm font-bold text-slate-700">{selectedCountry.dialCode}</span>
                    <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                            {COUNTRIES.map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => handleCountrySelect(c)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                        selectedCountry.code === c.code ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{c.flag}</span>
                                        <span>{t('common.countries.' + c.code.toLowerCase())}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{c.dialCode}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Phone Number Input */}
            <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                    type="tel"
                    required={required}
                    value={localNumber}
                    onChange={handleNumberChange}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
                
                {/* Visual indicator of digit count */}
                {localNumber.length > 0 && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            localNumber.length === selectedCountry.digits ? "text-emerald-500" : "text-slate-300"
                        )}>
                            {localNumber.length}/{selectedCountry.digits}
                        </span>
                     </div>
                )}
            </div>
            
            {/* Backdrop for closing dropdown */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[105]" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
