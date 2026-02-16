import { api } from "@/lib/api";

export interface DashboardUser {
    id: string;
    full_name: string;
    role: 'admin' | 'owner' | 'customer';
    phone: string;
    is_verified: boolean;
    status: 'pending' | 'active' | 'blocked';
    created_at: string;
}

export interface DashboardBusiness {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    owner: {
        full_name: string;
        phone: string;
    };
    created_at: string;
}

export const adminService = {
    async getAllUsers(params: { search?: string, role?: string, page?: number } = {}) {
        const result = await api.get<DashboardUser[]>('/admin/users', { params });
        return result as any;
    },

    async getAllBusinesses() {
        const result = await api.get<DashboardBusiness[]>('/admin/businesses');
        return result.data;
    },

    async updateUserRole(userId: string, role: string) {
        const result = await api.patch(`/admin/users/${userId}/role`, { role });
        return result.data;
    },

    async updateUserStatus(userId: string, status: string, is_verified?: boolean) {
        const result = await api.patch(`/admin/users/${userId}/status`, { status, is_verified });
        return result.data;
    },

    async inviteAdmin(phone: string) {
        const result = await api.post('/admin/invite', { phone });
        return result.data;
    }
};
