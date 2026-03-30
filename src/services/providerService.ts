import { api } from "@/lib/api";

export interface ServiceProvider {
    id: string;
    business_id: string;
    name: string;
    phone?: string;
    role?: string;
    department?: string;
    is_active: boolean;
    is_available?: boolean;
    leave_status?: 'available' | 'upcoming' | 'on_leave';
    leave_until?: string | null;
    leave_starts_at?: string | null;
    services?: any[];
    translations?: Record<string, any>;
    created_at: string;
}

export const providerService = {
    async getProviders(businessId?: string): Promise<ServiceProvider[]> {
        const url = businessId ? `/service-providers?business_id=${businessId}` : '/service-providers';
        const result = await api.get<ServiceProvider[]>(url);
        return result.data || [];
    },

    async getBulkLeaveStatus(businessId: string, date?: string): Promise<any[]> {
        const url = `/service-providers/leaves/status?business_id=${businessId}${date ? `&date=${date}` : ''}`;
        const result = await api.get<any[]>(url);
        return result.data || [];
    },

    async createProvider(data: Partial<ServiceProvider>): Promise<ServiceProvider> {
        const result = await api.post<ServiceProvider>('/service-providers', data);
        return result.data;
    },

    async updateProvider(id: string, data: Partial<ServiceProvider>): Promise<ServiceProvider> {
        const result = await api.patch<ServiceProvider>(`/service-providers/${id}`, data);
        return result.data;
    },

    async deleteProvider(id: string): Promise<void> {
        await api.delete(`/service-providers/${id}`);
    },

    async assignServices(providerId: string, serviceIds: string[]): Promise<void> {
        await api.post(`/service-providers/${providerId}/services`, { service_ids: serviceIds });
    },

    async getAvailability(providerId: string): Promise<any[]> {
        const result = await api.get<any[]>(`/service-providers/${providerId}/availability`);
        return result.data || [];
    },

    async updateAvailability(providerId: string, availability: any[]): Promise<void> {
        await api.put(`/service-providers/${providerId}/availability`, { availability });
    },

    // --- Provider Leaves ---

    async getLeaves(providerId: string, businessId?: string): Promise<any[]> {
        const url = `/service-providers/${providerId}/leaves${businessId ? `?business_id=${businessId}` : ''}`;
        const result = await api.get<any[]>(url);
        return result.data || [];
    },

    async addLeave(providerId: string, data: { start_date: string, end_date: string, leave_type: string, note?: string }): Promise<any> {
        const result = await api.post<any>(`/service-providers/${providerId}/leaves`, data);
        return result.data;
    },

    async deleteLeave(leaveId: string): Promise<void> {
        await api.delete(`/service-providers/leaves/${leaveId}`);
    },

    async getMyProfile(): Promise<ServiceProvider> {
        const result = await api.get<ServiceProvider>('/service-providers/me');
        return result.data;
    },

    async updateLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED'): Promise<any> {
        const result = await api.patch<any>(`/service-providers/leaves/${leaveId}/status`, { status });
        return result.data;
    }
};
