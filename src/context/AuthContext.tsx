"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { businessService, Business } from '@/services/businessService';

interface AuthContextType {
    user: any;
    business: Business | null;
    loading: boolean;
    login: (userData: any, token: string) => Promise<void>;
    logout: () => void;
    refreshBusiness: () => Promise<Business | null>;
    setBusiness: (business: Business | null) => void;
    isAuthenticated: boolean;
    hasBusiness: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setBusiness(null);
        // Use router for soft redirect if possible, otherwise window.location
        try {
            router.push('/login');
        } catch (e) {
            window.location.href = '/login';
        }
    }, [router]);

    const refreshBusiness = useCallback(async () => {
        try {
            const biz = await businessService.getMyBusiness();
            setBusiness(biz);
            return biz;
        } catch (error: any) {
            console.error('Failed to refresh business:', error);
            // If it's an Unauthorized error, api.ts already handled the redirect
            // but we should still clear state here if it wasn't already
            if (error.message === 'Unauthorized') {
                setUser(null);
                setBusiness(null);
            }
            return null;
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('auth_user');
            const token = authService.getToken();

            if (storedUser && token) {
                setUser(JSON.parse(storedUser));
                await refreshBusiness();
            }
            setLoading(false);
        };
        initAuth();
    }, [refreshBusiness]);

    const login = async (userData: any, token: string) => {
        setUser(userData);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        const biz = await refreshBusiness();
        if (biz) {
            router.push('/dashboard');
        } else {
            router.push('/setup');
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            business,
            loading,
            login,
            logout,
            refreshBusiness,
            setBusiness,
            isAuthenticated: !!user,
            hasBusiness: !!business
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
