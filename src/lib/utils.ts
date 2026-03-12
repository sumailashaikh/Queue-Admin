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

