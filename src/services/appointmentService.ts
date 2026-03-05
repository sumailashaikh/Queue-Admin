import { api } from "@/lib/api";

export interface Appointment {
    id: string;
    business_id: string;
    service_id: string;
    customer_id: string;
    start_time: string;
    end_time: string;
    status: 'requested' | 'scheduled' | 'confirmed' | 'in_queue' | 'serving' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled' | 'pending' | 'checked_in' | 'in_service' | 'expired';
    guest_name?: string;
    guest_phone?: string;
    total_price?: number;
    total_duration_minutes?: number;
    delay_minutes?: number;
    expected_start_at?: string;
    expected_end_at?: string;
    is_delayed?: boolean;
    is_late?: boolean;
    late_minutes?: number;
    appointment_state?: string;
    payment_method?: 'cash' | 'qr' | 'card' | 'unpaid';
    payment_status?: 'unpaid' | 'paid' | 'partially_paid';
    amount_paid?: number;
    queue_entry?: {
        id: string;
        status: string;
        ticket_number: string;
        assigned_provider_id?: string;
    };
    service_ids?: string[]; // For multi-service selection
    profiles?: {
        full_name: string;
        phone: string;
        id: string;
        ui_language?: string;
    };
    appointment_services?: {
        id: string;
        price: number;
        duration_minutes: number;
        services: {
            id: string;
            name: string;
            translations?: Record<string, string>;
        }
    }[];
}

export const appointmentService = {
    async createAppointment(data: Partial<Appointment> & { service_ids?: string[] }): Promise<Appointment> {
        const result = await api.post<Appointment>('/appointments', data);
        return result.data;
    },

    async bookPublicAppointment(data: {
        business_id: string;
        service_ids: string[];
        start_time: string;
        customer_name: string;
        phone: string;
        ui_language?: string;
    }): Promise<Appointment> {
        const result = await api.post<Appointment>('/public/appointment/book', data);
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
    },

    async reschedule(id: string, startTime: string): Promise<Appointment> {
        const result = await api.patch<Appointment>(`/appointments/${id}/reschedule`, { start_time: startTime });
        return result.data;
    },

    async cancel(id: string): Promise<Appointment> {
        const result = await api.patch<Appointment>(`/appointments/${id}/cancel`, {});
        return result.data;
    },

    async updatePayment(id: string, paymentMethod: 'cash' | 'qr' | 'card' | 'unpaid'): Promise<Appointment> {
        const result = await api.patch<Appointment>(`/appointments/${id}/payment`, { payment_method: paymentMethod });
        return result.data;
    }
};
