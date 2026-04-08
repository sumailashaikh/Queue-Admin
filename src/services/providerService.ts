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

    async getPendingLeaveCount(businessId: string): Promise<number> {
        const result = await api.get<{ pending_count: number }>(
            `/service-providers/leaves/pending-count?business_id=${encodeURIComponent(businessId)}`
        );
        const n = (result as any)?.data?.pending_count;
        return typeof n === 'number' ? n : 0;
    },

    async createProvider(data: Partial<ServiceProvider>): Promise<any> {
        const result = await api.post<ServiceProvider>('/service-providers', data);
        return result;
    },

    async updateProvider(id: string, data: Partial<ServiceProvider>): Promise<any> {
        const result = await api.patch<ServiceProvider>(`/service-providers/${id}`, data);
        return result;
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

    async validateLeave(providerId: string, data: { start_date: string, end_date: string, leave_kind?: string, start_time?: string, end_time?: string }): Promise<any> {
        const result = await api.post<any>(`/service-providers/${providerId}/leaves/validate`, data);
        return result;
    },

    async previewReassignPlan(providerId: string, data: { start_date: string; end_date: string; leave_kind?: string; start_time?: string; end_time?: string; appointment_ids?: string[] }): Promise<any> {
        const result = await api.post<any>(`/service-providers/${providerId}/leaves/reassign-plan`, data);
        return result;
    },

    async applyReassignPlan(providerId: string, assignments: { appointment_id: string; to_provider_id?: string | null }[]): Promise<any> {
        const result = await api.post<any>(`/service-providers/${providerId}/leaves/reassign-apply`, { assignments });
        return result;
    },

    async addLeave(
        providerId: string,
        data: {
            start_date: string;
            end_date: string;
            leave_type: string;
            leave_kind?: 'FULL_DAY' | 'HALF_DAY' | 'EMERGENCY';
            start_time?: string;
            end_time?: string;
            allow_owner_approval?: boolean;
            note?: string;
            ui_language?: string;
        }
    ): Promise<any> {
        const result = await api.post<any>(`/service-providers/${providerId}/leaves`, data);
        return result;
    },

    async deleteLeave(leaveId: string): Promise<void> {
        await api.delete(`/service-providers/leaves/${leaveId}`);
    },

    async getMyProfile(): Promise<ServiceProvider> {
        const result = await api.get<ServiceProvider>('/service-providers/me');
        return result.data;
    },

    async updateLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED', reason?: string): Promise<any> {
        const result = await api.patch<any>(`/service-providers/leaves/${leaveId}/status`, { status, reason });
        return result;
    },
};
