"use client";

import { useEffect, useMemo } from "react";

export default function DisplayError() {
    const lang = useMemo(() => {
        if (typeof window === "undefined") return "en";
        const code = (navigator.language || "en").slice(0, 2).toLowerCase();
        return ["en", "es", "hi", "ar"].includes(code) ? code : "en";
    }, []);

    useEffect(() => {
        // Route-level reset on manual refresh
    }, []);

    const text = {
        en: {
            title: "Display temporarily unavailable",
            desc: "We could not load the TV screen. Please refresh once.",
            btn: "Refresh"
        },
        es: {
            title: "Pantalla temporalmente no disponible",
            desc: "No se pudo cargar la pantalla TV. Por favor, actualiza una vez.",
            btn: "Actualizar"
        },
        hi: {
            title: "डिस्प्ले अस्थायी रूप से उपलब्ध नहीं है",
            desc: "टीवी स्क्रीन लोड नहीं हो पाई। कृपया एक बार रिफ्रेश करें।",
            btn: "रिफ्रेश करें"
        },
        ar: {
            title: "شاشة العرض غير متاحة مؤقتاً",
            desc: "تعذر تحميل شاشة التلفاز. يرجى التحديث مرة واحدة.",
            btn: "تحديث"
        }
    } as const;

    const t = text[lang as keyof typeof text] || text.en;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow">
                <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
                <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-semibold"
                >
                    {t.btn}
                </button>
            </div>
        </div>
    );
}

