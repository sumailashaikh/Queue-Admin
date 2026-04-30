import { api } from "@/lib/api";

export interface PaymentSettings {
  id?: string;
  business_id: string;
  upi_id: string;
  qr_code_url: string;
  qr_type: "generated";
  created_at?: string;
  updated_at?: string;
}

export const paymentSettingsService = {
  async getByBusinessId(businessId: string): Promise<PaymentSettings | null> {
    const result = await api.get<PaymentSettings | null>(`/payment-settings/${businessId}`);
    return result.data || null;
  },

  async save(data: { business_id: string; upi_id: string }): Promise<PaymentSettings> {
    const result = await api.post<PaymentSettings>("/payment-settings", data);
    return result.data;
  },
};

