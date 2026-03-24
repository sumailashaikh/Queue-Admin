"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { businessService, Business } from '@/services/businessService';

interface AuthContextType {
    user: any;
    business: Business | null;
    loading: boolean;
    login: (userData: any, token: string, isNewUser?: boolean) => Promise<void>;
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

    const refreshUser = useCallback(async () => {
        try {
            const { data: profile } = await authService.getProfile();
            if (profile) {
                setUser(profile);
                localStorage.setItem('auth_user', JSON.stringify(profile));
                return profile;
            }
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
        }
        return null;
    }, []);

    const refreshBusiness = useCallback(async () => {
        try {
            const biz = await businessService.getMyBusiness();
            setBusiness(biz);
            // Also refresh user data whenever business is refreshed to keep sync
            await refreshUser();
            return biz;
        } catch (error: any) {
            console.error('Failed to refresh business:', error);
            if (error.message === 'Unauthorized') {
                setUser(null);
                setBusiness(null);
            }
            return null;
        }
    }, [refreshUser]);

    useEffect(() => {
        const initAuth = async () => {
            const token = authService.getToken();

            if (token) {
                // Always fetch fresh profile on init
                await refreshUser();
                await refreshBusiness();
            }
            setLoading(false);
        };
        initAuth();
    }, [refreshBusiness, refreshUser]);

    const login = async (userData: any, token: string, isNewUser?: boolean) => {
        localStorage.setItem('auth_token', token);
        // Fetch fresh profile after login to get all fields
        const profile = await refreshUser();
        const userToUse = profile || userData;

        // Admins go straight to dashboard
        if (userToUse.role === 'admin') {
            router.push('/dashboard/admin');
            return;
        }

        const biz = await refreshBusiness();

        if (isNewUser) {
            router.push('/setup');
        } else if (biz) {
            if (userToUse.role === 'owner' && !userToUse.is_verified) {
                router.push('/dashboard/verification-pending');
            } else {
                router.push('/dashboard');
            }
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
