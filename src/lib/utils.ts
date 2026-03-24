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
    if (!text) return true;

    // Common symbols, numbers and punctuation allowed across all languages
    const common = "0-9\\s.,!?'\"()&@#%*+=\\-\\/\\[\\]{}|_\\\\";

    const regexMap: Record<string, RegExp> = {
        'en': new RegExp(`^[a-zA-Z${common}]*$`),
        'es': new RegExp(`^[a-zA-Z${common}áéíóúüñÁÉÍÓÚÜÑ]*$`),
        'hi': new RegExp(`^[\\u0900-\\u097F${common}]*$`),
        'ar': new RegExp(`^[\\u0600-\\u06FF${common}]*$`)
    };

    const regex = regexMap[language] || regexMap['en'];
    return regex.test(text);
}
