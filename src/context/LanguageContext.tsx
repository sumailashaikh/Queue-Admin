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
    setLanguage: (lang: string) => Promise<void>;
    t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [language, setLangState] = useState('en');

    useEffect(() => {
        if (user && user.ui_language) {
            setLangState(user.ui_language);
            localStorage.setItem('ui_language', user.ui_language);
        } else {
            const saved = localStorage.getItem('ui_language');
            if (saved) setLangState(saved);
        }
    }, [user]);

    const setLanguage = async (newLang: string) => {
        setLangState(newLang);
        localStorage.setItem('ui_language', newLang);

        if (user) {
            try {
                const storedUser = localStorage.getItem('auth_user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    localStorage.setItem('auth_user', JSON.stringify({ ...parsed, ui_language: newLang }));
                }

                await api.put('/users/language', { ui_language: newLang });
            } catch (error) {
                console.error('Failed to update language on server', error);
            }
        }
    };

    const t = (key: string, params?: Record<string, any>): string => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }

        if (value === undefined && language !== 'en') {
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
