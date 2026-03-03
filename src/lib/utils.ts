import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = 'USD', language: string = 'en') {
    try {
        const formattedAmount = new Intl.NumberFormat(language, {
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(amount);
        return `${currencyCode} ${formattedAmount}`;
    } catch (e) {
        return `${currencyCode} ${amount}`;
    }
}

