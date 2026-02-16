import { api } from "@/lib/api";

export interface Service {
    id: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    business_id: string;
}

export const serviceService = {
    async getMyServices(): Promise<Service[]> {
        const result = await api.get<Service[]>('/services/my');
        return result.data || [];
    },

    async createService(data: Partial<Service>): Promise<Service> {
        const result = await api.post<Service>('/services', data);
        return result.data;
    },

    async deleteService(id: string): Promise<void> {
        await api.delete(`/services/${id}`);
    }
};
