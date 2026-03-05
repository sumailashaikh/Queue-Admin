import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCodeParam: string = 'USD', language: string = 'en') {
    // Map languages to specific currencies based on user preference
    const LangCurrencyMap: Record<string, string> = {
        'en': 'USD',
        'es': 'EUR',
        'hi': 'INR',
        'ar': 'AED'
    };

    // Force the currency code to strictly follow the language selection
    const currencyCode = LangCurrencyMap[language] || 'USD';

    try {
        // Map language to locale for Intl.NumberFormat
        const localeMap: Record<string, string> = {
            'en': 'en-US',
            'es': 'es-ES',
            'hi': 'en-IN', // Forcing en-IN ensures INR is printed as ₹ X instead of using Hindi formatting which usually differs
            'ar': 'en-AE' // For AED, ensure the English layout (e.g., AED 1,000) or Arabic (د.إ)
        };
        const locale = localeMap[language] || 'en-US';

        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0
        });

        // Clean formatting bugs that happen with some locales (i.e space before/after EUR symbol)
        let formatted = formatter.format(amount);

        // If the language is es (Spanish) and currency EUR, it usually outputs "10 €". 
        // We will just let Intl.NumberFormat do its native job depending on Locale. 
        // For Hindi we use en-IN to get "₹10" instead of local native suffix.

        return formatted;
    } catch (e) {
        return `${currencyCode} ${amount}`;
    }
}

