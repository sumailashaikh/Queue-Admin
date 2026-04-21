"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

export function useBusinessCurrency(currencyCode?: string, language: string = "en") {
    const currency = useMemo(() => {
        const raw = String(currencyCode || "USD").trim().toUpperCase();
        return raw || "USD";
    }, [currencyCode]);

    const format = (price: number) => formatCurrency(Number(price || 0), currency, language);

    return { currency, format };
}

