import { api } from "@/lib/api";
import { ServiceProvider } from "./providerService";

export interface Queue {
    id: string;
    name: string;
    description: string;
    status: 'open' | 'closed';
    business_id: string;
    current_wait_time_minutes: number;
    services?: {
        id: string;
        name: string;
        price: number;
    };
}

export interface QueueEntryService {
    id: string;
    price: number;
    duration_minutes: number;
    assigned_provider_id?: string;
    task_status: 'pending' | 'in_progress' | 'done' | 'cancelled';
    started_at?: string;
    completed_at?: string;
    estimated_end_at?: string;
    actual_minutes?: number;
    delay_minutes?: number;
    services: {
        id: string;
        name: string;
    }
    service_providers?: {
        name: string;
    };
}

export interface QueueEntry {
    id: string;
    customer_name: string;
    phone: string;
    service_name: string;
    status: 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show' | 'skipped';
    position: number;
    ticket_number: string;
    joined_at: string;
    served_at?: string;
    completed_at?: string;
    queue_id: string;
    appointment_id?: string;
    appointments?: {
        id: string;
        start_time: string;
        checked_in_at?: string;
    };
    token?: string; // status_token for public page
    status_token?: string;
    wait_time?: number;
    total_price: number;
    total_duration_minutes: number;
    assigned_provider_id?: string;
    service_providers?: {
        name: string;
    };
    payment_method?: 'cash' | 'qr' | 'card' | 'unpaid';
    amount_paid?: number;
    delay_minutes?: number; // Might be useful for appointments seen in the queue
    entry_source?: 'online' | 'qr_walkin' | 'manual';
    queue_entry_services?: QueueEntryService[];
}

export const queueService = {
    async getMyQueues(): Promise<Queue[]> {
        const result = await api.get<Queue[]>('/queues/my');
        return result.data || [];
    },

    async createQueue(data: Partial<Queue>): Promise<Queue> {
        const result = await api.post<Queue>('/queues', data);
        return result.data;
    },

    async updateQueue(id: string, data: Partial<Queue>): Promise<Queue> {
        const result = await api.put<Queue>(`/queues/${id}`, data);
        return result.data;
    },

    async deleteQueue(id: string): Promise<void> {
        await api.delete(`/queues/${id}`);
    },

    async getQueueEntriesToday(queueId: string): Promise<QueueEntry[]> {
        const result = await api.get<QueueEntry[]>(`/queues/${queueId}/today`);
        return result.data || [];
    },

    async updateEntryStatus(entryId: string, status: QueueEntry['status']): Promise<QueueEntry> {
        const result = await api.patch<QueueEntry>(`/queues/entries/${entryId}/status`, { status });
        return result.data;
    },

    async resetQueueEntries(queueId: string): Promise<void> {
        await api.delete(`/queues/${queueId}/entries/today`);
    },

    async joinQueue(data: {
        queue_id: string,
        customer_name: string,
        phone?: string,
        service_name?: string,
        service_ids?: string[],
        provider_id?: string,
        entry_source?: 'online' | 'qr_walkin' | 'manual',
        ui_language?: string,
        language_code?: string
    }): Promise<QueueEntry> {
        const result = await api.post<QueueEntry>('/public/queue/join', data);
        return result.data;
    },

    async createWalkIn(data: {
        queue_id: string,
        customer_name: string,
        phone?: string | null,
        service_ids?: string[],
        provider_id?: string
    }): Promise<QueueEntry> {
        const result = await api.post<QueueEntry>('/queues/walk-in', data);
        return result.data;
    },

    async nextEntry(queueId: string): Promise<void> {
        await api.post('/queues/next', { queue_id: queueId });
    },

    // Per-Service Tasks (Phase 3)
    async assignTaskProvider(taskId: string, providerId: string | null): Promise<{ status: string }> {
        const result = await api.patch<{ status: string }>(`/queues/services/${taskId}/assign-provider`, { provider_id: providerId });
        return result.data;
    },

    async startTask(taskId: string): Promise<{ status: string }> {
        const result = await api.patch<{ status: string }>(`/queues/services/${taskId}/start`, {});
        return result.data;
    },

    async completeTask(taskId: string): Promise<{ status: string }> {
        const result = await api.patch<{ status: string }>(`/queues/services/${taskId}/complete`, {});
        return result.data;
    },

    async noShowEntry(entryId: string): Promise<QueueEntry> {
        const result = await api.patch<QueueEntry>(`/queues/entries/${entryId}/no-show`, {});
        return result.data;
    },
    async skipEntry(entryId: string): Promise<QueueEntry> {
        const result = await api.patch<QueueEntry>(`/queues/entries/${entryId}/skip`, {});
        return result.data;
    },
    async restoreEntry(entryId: string): Promise<QueueEntry> {
        const result = await api.patch<QueueEntry>(`/queues/entries/${entryId}/restore`, {});
        return result.data;
    },

    async updatePayment(entryId: string, paymentMethod: 'cash' | 'qr' | 'card' | 'unpaid'): Promise<QueueEntry> {
        const result = await api.patch<QueueEntry>(`/queues/entries/${entryId}/payment`, { payment_method: paymentMethod });
        return result.data;
    },

    async getMyTasks(): Promise<QueueEntry[]> {
        const result = await api.get<QueueEntry[]>('/queues/my-tasks');
        return result.data || [];
    },

    async initializeEntryTasks(entryId: string, providerId?: string): Promise<{ status: string }> {
        const result = await api.post<{ status: string }>(`/queues/entries/${entryId}/initialize-tasks`, { provider_id: providerId });
        return result.data;
    }
}
