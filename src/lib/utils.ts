import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCodeParam: string = 'USD', language: string = 'en') {
    // Map language to currency for symbols (e.g., hi -> INR -> ₹)
    const languageToCurrency: Record<string, string> = {
        'en': 'USD',
        'es': 'EUR',
        'hi': 'INR',
        'ar': 'AED'
    };

    // Priority 1: Force currency based on language (User requirement)
    // Priority 2: Use provided parameter
    // Priority 3: Default to USD
    let currencyCode = languageToCurrency[language] || currencyCodeParam || 'USD';
    
    // Safety check for empty strings or invalid codes
    if (!currencyCode || currencyCode === 'null') currencyCode = 'USD';

    try {
        // Map language to locale for formatting rules (commas, decimals, position)
        const localeMap: Record<string, string> = {
            'en': 'en-US',
            'es': 'es-ES',
            'hi': 'hi-IN',
            'ar': 'ar-SA'
        };
        const locale = localeMap[language] || 'en-US';

        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0
        });

        return formatter.format(amount);
    } catch (e) {
        return `${currencyCode} ${amount}`;
    }
}

export function formatDuration(minutes: number, t: (key: string, options?: any) => string) {
    if (minutes < 60) {
        return t('common.duration_m', { m: minutes });
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return t(hours === 1 ? 'common.duration_h' : 'common.duration_hs', { h: hours });
    }

    return t(hours === 1 ? 'common.duration_hm' : 'common.duration_hsm', { h: hours, m: remainingMinutes });
}

export function validateLanguage(text: string, language: string): boolean {
    if (!text || !text.trim()) return true;

    const baseLang = (language || 'en').split('-')[0].toLowerCase();
    const commonPattern = "0-9\\s\\.,!?'\"()&@#%*+=\\-\\/\\[\\]{}|_\\\\";

    const patterns: Record<string, string> = {
        'en': `a-zA-Z${commonPattern}`,
        'es': `a-zA-ZáéíóúüñÁÉÍÓÚÜÑ${commonPattern}`,
        'hi': `\\u0900-\\u097F${commonPattern}`,
        'ar': `\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF${commonPattern}`
    };

    const pattern = patterns[baseLang] || patterns['en'];
    
    // Explicitly disallow English letters in Hindi/Arabic if they aren't explicitly in the pattern
    // (Patterns above don't include a-zA-Z for hi/ar)
    try {
        const regex = new RegExp(`^[${pattern}]*$`, 'u');
        return regex.test(text);
    } catch (e) {
        // Fallback for environments without 'u' flag support, though unlikely in modern Next.js
        const regex = new RegExp(`^[${pattern}]*$`);
        return regex.test(text);
    }
}

/** BCP-47 locale for calendar formatting from app language code. */
export function localeForLanguage(language: string): string {
    const base = (language || "en").split("-")[0].toLowerCase();
    const map: Record<string, string> = { en: "en-US", es: "es-ES", hi: "hi-IN", ar: "ar-SA" };
    return map[base] || "en-US";
}

/**
 * Format a date-only (YYYY-MM-DD) or ISO string for leave UI.
 * Uses midday local parse to avoid calendar-day shifts for date-only values.
 */
export function formatLeaveDate(dateStr: string, language: string): string {
    const raw = String(dateStr || "").trim();
    if (!raw) return "";
    const iso = raw.length <= 10 && !raw.includes("T") ? `${raw}T12:00:00` : raw;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(localeForLanguage(language), {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

export function formatLeaveDateRange(start: string, end: string, language: string): string {
    const a = formatLeaveDate(start, language);
    const b = formatLeaveDate(end, language);
    if (!a) return b;
    if (!b || a === b) return a;
    return `${a} – ${b}`;
}
