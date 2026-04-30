import { api } from "@/lib/api";

export interface DailySummary {
    totalCustomers: number;
    completedVisits: number;
    totalRevenue: number;
    avgWaitTimeMinutes: number;
}

export interface ProviderServiceStats {
    service_name: string;
    count: number;
    revenue: number;
    avg_time: number;
}

export interface ProviderAnalytics {
    provider_id: string;
    provider_name: string;
    services_completed: number;
    total_revenue: number;
    total_active_minutes: number;
    total_working_minutes: number;
    total_working_hours: number;
    working_days: number;
    leave_full_days: number;
    leave_half_days: number;
    leaves_taken: number;
    leave_records: {
        type: 'full' | 'half' | 'emergency';
        startDate: string;
        endDate: string;
        status: 'pending' | 'approved' | 'rejected';
    }[];
    on_leave_today: boolean;
    upcoming_leave_count: number;
    past_leave_count: number;
    avg_service_time_minutes: number;
    service_breakdown: ProviderServiceStats[];
    daily_work_log: ProviderDailyWorkLog[];
}

export interface ProviderDailyWorkLog {
    date: string;
    hours_worked: number;
    status: string;
    status_code: 'present' | 'half_day' | 'leave_half' | 'leave_full';
}

export interface AnalyticsSummaryStats {
    total_revenue: number;
    total_services: number;
    avg_service_time: number;
    total_working_hours: number;
    working_days: number;
    leaves_taken: number;
}

export interface ProviderAnalyticsResponse {
    status: string;
    data: ProviderAnalytics[];
    summary: AnalyticsSummaryStats;
}

export const analyticsService = {
    async getDailySummary(): Promise<DailySummary> {
        const result = await api.get<DailySummary>('/analytics/today');
        return result.data;
    },

    async getProviderAnalytics(params: {
        business_id: string;
        range: 'daily' | 'weekly' | 'monthly';
        date?: string;
    }): Promise<ProviderAnalyticsResponse> {
        const queryParams = new URLSearchParams(params as unknown as Record<string, string>).toString();
        const result = await api.get<any>(`/analytics/provider-analytics?${queryParams}`);
        // The api.get returns the whole JSON response, so we cast it to the structured response type
        return result as unknown as ProviderAnalyticsResponse;
    }
};
