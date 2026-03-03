import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, _currencyCodeParam: string = 'USD', language: string = 'en') {
    // Map languages to specific currencies based on user preference
    const LangCurrencyMap: Record<string, string> = {
        'en': 'USD',
        'es': 'EUR',
        'hi': 'INR',
        'ar': 'AED'
    };

    const currencyCode = LangCurrencyMap[language] || 'USD';

    try {
        // We use native style format so the correct symbol ($, €, ₹, د.إ) is beautifully printed
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (e) {
        return `${currencyCode} ${amount}`;
    }
}

