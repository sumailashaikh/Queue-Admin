import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCodeParam: string = 'USD', language: string = 'en') {
    // Always use the business's selected currency
    const currencyCode = currencyCodeParam || 'USD';

    try {
        // Map language to locale for formatting rules (commas, decimals, position)
        const localeMap: Record<string, string> = {
            'en': 'en-GB',
            'es': 'es-ES',
            'hi': 'hi-IN',
            'ar': 'ar-SA'
        };
        const locale = localeMap[language] || 'en-GB';

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

