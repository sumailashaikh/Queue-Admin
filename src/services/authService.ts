import { api } from "@/lib/api";

export const authService = {
    async sendOTP(phone: string) {
        return api.post('/auth/otp', { phone });
    },

    async verifyOTP(phone: string, otp: string) {
        const invite_token = typeof window !== 'undefined' ? localStorage.getItem('pending_invite_token') : null;
        const result = await api.post<any>('/auth/verify', { phone, otp, invite_token });

        // Store token and user data
        if (result.data?.session?.access_token) {
            localStorage.setItem('auth_token', result.data.session.access_token);
            localStorage.setItem('auth_user', JSON.stringify(result.data.user));
            // One-time use on client side as well
            if (invite_token) localStorage.removeItem('pending_invite_token');
        }

        return result;
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    },

    getToken() {
        return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    },

    async getProfile() {
        return api.get<any>('/users/me');
    }
};
