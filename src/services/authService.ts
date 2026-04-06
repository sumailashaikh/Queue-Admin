import { api } from "@/lib/api";

export const authService = {
    async sendOTP(phone: string) {
        return api.post('/auth/otp', { phone });
    },

    async verifyOTP(phone: string, otp: string) {
        // Never send a stale invite token unless user opened /invite in this session (PWA keeps localStorage forever).
        let invite_token: string | null = null;
        if (typeof window !== "undefined") {
            try {
                if (sessionStorage.getItem("queueup_invite_flow") === "1") {
                    invite_token = localStorage.getItem("pending_invite_token");
                } else {
                    localStorage.removeItem("pending_invite_token");
                }
            } catch {
                invite_token = null;
            }
        }

        const payload: { phone: string; otp: string; invite_token?: string } = { phone, otp };
        if (invite_token) payload.invite_token = invite_token;

        const result = await api.post<any>("/auth/verify", payload);

        // Store token and user data
        if (result.data?.session?.access_token) {
            localStorage.setItem('auth_token', result.data.session.access_token);
            localStorage.setItem('auth_user', JSON.stringify(result.data.user));
            // One-time use on client side as well
            if (invite_token) localStorage.removeItem('pending_invite_token');
            try {
                sessionStorage.removeItem('queueup_invite_flow');
            } catch {
                /* ignore */
            }
        }

        return result;
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        try {
            localStorage.removeItem('pending_invite_token');
            sessionStorage.removeItem('queueup_invite_flow');
        } catch {
            /* ignore */
        }
    },

    getToken() {
        return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    },

    async getProfile() {
        return api.get<any>('/users/me');
    }
};
