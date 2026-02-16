import { api } from "@/lib/api";

export interface DailySummary {
    totalCustomers: number;
    completedVisits: number;
    totalRevenue: number;
    avgWaitTimeMinutes: number;
}

export const analyticsService = {
    async getDailySummary(): Promise<DailySummary> {
        const result = await api.get<DailySummary>('/analytics/today');
        return result.data;
    }
};
