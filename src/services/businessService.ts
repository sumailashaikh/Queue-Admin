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
  staff_open_time?: string;
  staff_close_time?: string;
  is_closed: boolean;
  currency?: string;
  timezone?: string;
  language?: string;
  availability_status?: "open" | "closed" | "emergency_closed";
  availability_message?: string | null;
  availability?: {
    isOpen: boolean;
    state: "open" | "closed" | "emergency_closed";
    message?: string;
    currentTime?: string;
    opensAt?: string;
    closesAt?: string;
  };
}

export interface PublicProviderInsight {
  id: string;
  name: string;
  role?: string;
  department?: string;
  service_ids: string[];
  queue_ahead: number;
  estimated_wait_minutes: number;
  active_appointments: number;
  is_available_now: boolean;
  is_on_leave?: boolean;
  busy_source?: "on_leave" | "queue" | "appointment" | "free";
  next_available_in_minutes?: number;
}

export const businessService = {
  async getMyBusiness(): Promise<Business | null> {
    try {
      const result = await api.get<Business | Business[]>("/businesses/me");

      // Handle both single object and array responses
      if (Array.isArray(result.data)) {
        return result.data.length > 0 ? result.data[0] : null;
      }

      return result.data;
    } catch (error: any) {
      if (error.message === "API Error: 404") return null;
      if (error.message === "Unauthorized") return null;
      console.error("Error fetching business:", error);
      throw error;
    }
  },

  async createBusiness(data: Partial<Business>): Promise<Business> {
    const result = await api.post<Business>("/businesses", data);
    return result.data;
  },

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    const result = await api.put<Business>(`/businesses/${id}`, data);
    return result.data;
  },

  async deleteBusiness(id: string): Promise<void> {
    await api.delete(`/businesses/${id}`);
  },

  async getBusinessBySlug(
    slug: string,
  ): Promise<Business & { queues: any[]; services: any[] }> {
    const result = await api.get<Business & { queues: any[]; services: any[] }>(
      `/businesses/slug/${slug}`,
    );
    return result.data;
  },

  async getBusinessDisplayData(
    slug: string,
  ): Promise<{ business: Business & { queues: any[] }; entries: any[] }> {
    const result = await api.get<{
      business: Business & { queues: any[] };
      entries: any[];
    }>(`/public/business/${slug}/display-data`);
    return result.data;
  },

  async getPublicProviders(slug: string): Promise<PublicProviderInsight[]> {
    const result = await api.get<PublicProviderInsight[]>(
      `/public/business/${slug}/providers`,
    );
    return result.data || [];
  },

  async getPublicProviderSlots(
    slug: string,
    providerId: string,
    date: string,
    durationMinutes: number,
  ): Promise<string[]> {
    const result = await api.get<{ date: string; slots: string[] }>(
      `/public/business/${slug}/providers/${providerId}/slots?date=${encodeURIComponent(date)}&duration_minutes=${durationMinutes}`,
    );
    return result.data?.slots || [];
  },

  async inviteEmployee(data: {
    name: string;
    phone: string;
    business_id: string;
    role?: string;
    custom_message?: string;
    ui_language?: string;
  }): Promise<any> {
    const result = await api.post("/businesses/invite-employee", {
      phone: data.phone,
      full_name: data.name,
      business_id: data.business_id,
      role: data.role || "employee",
      custom_message: data.custom_message,
      ui_language: data.ui_language,
    });
    return result;
  },

  async deactivateEmployee(employeeId: string): Promise<any> {
    const result = await api.post(
      `/businesses/deactivate-employee/${employeeId}`,
    );
    return result;
  },

  async submitResignation(data: {
    reason?: string;
    requested_last_date?: string;
  }): Promise<void> {
    await api.post("/service-providers/resignation", data);
  },

  async getResignationRequests(businessId: string): Promise<any[]> {
    const result = await api.get<any[]>(
      `/service-providers/resignation/list?business_id=${businessId}`,
    );
    return result.data;
  },

  async getMyResignationRequests(): Promise<any[]> {
    const result = await api.get<any[]>("/service-providers/resignation/my");
    return result.data || [];
  },

  async updateResignationStatus(
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ): Promise<{ notification_sent?: boolean }> {
    const result = await api.patch<any>(
      `/service-providers/resignation/${requestId}/status`,
      { status },
    );
    return result;
  },

  async listVipCustomers(businessId: string): Promise<any[]> {
    const result = await api.get<any[]>(
      `/businesses/${businessId}/customers/vip`,
    );
    return result.data || [];
  },

  async setCustomerVipFlag(
    businessId: string,
    customerId: string,
    isVip: boolean,
    vipNote?: string,
  ): Promise<any> {
    const result = await api.put<any>(
      `/businesses/${businessId}/customers/${customerId}/vip`,
      {
        is_vip: isVip,
        vip_note: vipNote,
      },
    );
    return result.data;
  },
};
