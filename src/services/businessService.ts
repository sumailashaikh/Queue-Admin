import { api } from "@/lib/api";

export interface Business {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    whatsapp_number?: string;
    description: string;
    owner_id: string;
    open_time: string;
    close_time: string;
    is_closed: boolean;
    currency?: string;
    timezone?: string;
    language?: string;
}

export const businessService = {
    async getMyBusiness(): Promise<Business | null> {
        try {
            const result = await api.get<Business | Business[]>('/businesses/me');

            // Handle both single object and array responses
            if (Array.isArray(result.data)) {
                return result.data.length > 0 ? result.data[0] : null;
            }

            return result.data;
        } catch (error: any) {
            if (error.message === 'API Error: 404') return null;
            if (error.message === 'Unauthorized') return null;
            console.error('Error fetching business:', error);
            throw error;
        }
    },

    async createBusiness(data: Partial<Business>): Promise<Business> {
        const result = await api.post<Business>('/businesses', data);
        return result.data;
    },

    async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
        const result = await api.put<Business>(`/businesses/${id}`, data);
        return result.data;
    },

    async deleteBusiness(id: string): Promise<void> {
        await api.delete(`/businesses/${id}`);
    },

    async getBusinessBySlug(slug: string): Promise<Business & { queues: any[], services: any[] }> {
        const result = await api.get<Business & { queues: any[], services: any[] }>(`/businesses/slug/${slug}`);
        return result.data;
    },

    async getBusinessDisplayData(slug: string): Promise<{ business: Business & { queues: any[] }, entries: any[] }> {
        const result = await api.get<{ business: Business & { queues: any[] }, entries: any[] }>(`/public/business/${slug}/display-data`);
        return result.data;
    },

    async inviteEmployee(data: { name: string, phone: string, business_id: string, role?: string, custom_message?: string }): Promise<any> {
        const result = await api.post('/businesses/invite-employee', {
            phone: data.phone,
            full_name: data.name,
            business_id: data.business_id,
            role: data.role || 'employee',
            custom_message: data.custom_message
        });
        return result;
    },

    async deactivateEmployee(employeeId: string): Promise<any> {
        const result = await api.post(`/businesses/deactivate-employee/${employeeId}`);
        return result;
    },

    async submitResignation(data: { reason?: string, requested_last_date?: string }): Promise<void> {
        await api.post('/service-providers/resignation', data);
    },

    async getResignationRequests(businessId: string): Promise<any[]> {
        const result = await api.get<any[]>(`/service-providers/resignation/list?business_id=${businessId}`);
        return result.data;
    },

    async updateResignationStatus(requestId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
        await api.patch(`/service-providers/resignation/${requestId}/status`, { status });
    }
};
