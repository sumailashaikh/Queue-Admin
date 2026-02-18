import { api } from "@/lib/api";

export interface Appointment {
    id: string;
    business_id: string;
    service_id: string;
    customer_id: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'scheduled' | 'confirmed' | 'checked_in' | 'in_service' | 'completed' | 'cancelled';
    guest_name?: string;
    guest_phone?: string;
    service_ids?: string[]; // For multi-service selection
    profiles?: {
        full_name: string;
        phone: string;
        id: string;
    };
    services?: {
        name: string;
        duration_minutes: number;
    };
}

export const appointmentService = {
    async createAppointment(data: Partial<Appointment> & { service_ids?: string[] }): Promise<Appointment> {
        const result = await api.post<Appointment>('/appointments', data);
        return result.data;
    },

    async getCustomerAppointments(): Promise<Appointment[]> {
        const result = await api.get<Appointment[]>('/appointments/my');
        return result.data || [];
    },

    async getBusinessAppointments(): Promise<Appointment[]> {
        const result = await api.get<Appointment[]>('/appointments/business');
        return result.data || [];
    },

    async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
        const result = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
        return result.data;
    }
};
