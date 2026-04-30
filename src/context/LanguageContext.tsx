"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import es from '@/locales/es.json';
import ar from '@/locales/ar.json';
import { api } from '@/lib/api';

const translations: Record<string, any> = { en, hi, es, ar };

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string, persist?: boolean) => Promise<void>;
    t: (key: string, params?: Record<string, any>, overrideLang?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { user, business } = useAuth();
    const [language, setLangState] = useState('en');
    const [isTemporary, setIsTemporary] = useState(false);

    useEffect(() => {
        if (isTemporary) return; // Do not clobber temporary display languages

        // Business language is owner-controlled and should drive staff portal language.
        if (business?.language) {
            setLangState(business.language);
            localStorage.setItem('ui_language', business.language);
        } else if (user && user.ui_language) {
            setLangState(user.ui_language);
            localStorage.setItem('ui_language', user.ui_language);
        } else {
            const saved = localStorage.getItem('ui_language');
            if (saved) setLangState(saved);
        }
    }, [user, business?.language, isTemporary]);

    const setLanguage = async (newLang: string, persist: boolean = true) => {
        setLangState(newLang);

        if (!persist) {
            setIsTemporary(true);
            return;
        }

        setIsTemporary(false);
        localStorage.setItem('ui_language', newLang);

        // In business portal, language is driven by business settings, so no profile write needed.
        if (user && !business?.id) {
            try {
                const storedUser = localStorage.getItem('auth_user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    localStorage.setItem('auth_user', JSON.stringify({ ...parsed, ui_language: newLang }));
                }

                await api.put('/users/language', { ui_language: newLang });
            } catch (error) {
                // Keep UI responsive even if optional language persistence fails.
            }
        }
    };

    const t = (key: string, params?: Record<string, any>, overrideLang?: string): string => {
        const keys = key.split('.');
        const activeLang = overrideLang || language;
        let value = translations[activeLang] || translations['en'];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }

        if (value === undefined && activeLang !== 'en') {
            value = translations['en'];
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    value = key;
                    break;
                }
            }
        }

        let result = value !== undefined ? String(value) : key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }

        return result;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
