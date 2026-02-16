import { api } from "@/lib/api";

export const authService = {
    async sendOTP(phone: string) {
        return api.post('/auth/otp', { phone });
    },

    async verifyOTP(phone: string, otp: string) {
        const result = await api.post<any>('/auth/verify', { phone, otp });

        // Store token and user data
        if (result.data?.session?.access_token) {
            localStorage.setItem('auth_token', result.data.session.access_token);
            localStorage.setItem('auth_user', JSON.stringify(result.data.user));
        }

        return result;
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    },

    getToken() {
        return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    }
};
