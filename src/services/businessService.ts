import { api } from "@/lib/api";

export interface Business {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    description: string;
    owner_id: string;
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

    async getBusinessBySlug(slug: string): Promise<Business & { queues: any[] }> {
        const result = await api.get<Business & { queues: any[] }>(`/businesses/slug/${slug}`);
        return result.data;
    }
};
