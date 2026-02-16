import { api } from "@/lib/api";

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

export interface QueueEntry {
    id: string;
    customer_name: string;
    phone: string;
    service_name: string;
    status: 'waiting' | 'serving' | 'completed' | 'cancelled';
    position: number;
    ticket_number: string;
    joined_at: string;
    served_at?: string;
    queue_id: string;
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

    async joinQueue(data: { queue_id: string, customer_name: string, phone?: string, service_name?: string }): Promise<QueueEntry> {
        const result = await api.post<QueueEntry>('/queues/join', data);
        return result.data;
    }
};
