import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = 'USD', language: string = 'en') {
    try {
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (e) {
        return `${currencyCode} ${amount}`;
    }
}

