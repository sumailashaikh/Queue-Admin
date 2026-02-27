import { parsePhoneNumberWithError, ParseError } from 'libphonenumber-js';

/**
 * Formats a phone number cleanly to E.164 format.
 * If no country code is provided, defaults to the provided defaultCountry (e.g., US, IN).
 * 
 * @param phone Raw phone string
 * @param defaultCountry ISO 2-letter country code fallback
 * @returns Clean E.164 string | null if invalid
 */
export function formatGlobalPhone(phone: string, defaultCountry: any = 'IN'): string | null {
    if (!phone) return null;
    try {
        const phoneNumber = parsePhoneNumberWithError(phone, defaultCountry);
        if (phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
        return null;
    } catch (error) {
        if (error instanceof ParseError) {
            console.error("Phone parse error:", error.message);
        }
        return null;
    }
}

/**
 * Validates a given phone number globally.
 */
export function isValidGlobalPhone(phone: string, defaultCountry: any = 'IN'): boolean {
    return formatGlobalPhone(phone, defaultCountry) !== null;
}
