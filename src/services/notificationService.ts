import { api } from "@/lib/api";

export interface AppNotification {
  id: string;
  business_id: string;
  user_id?: string | null;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export const notificationService = {
  async listMy(): Promise<{ data: AppNotification[]; unread: number }> {
    const result = await api.get<any>("/notifications");
    return {
      data: result.data || [],
      unread: Number(result.unread || 0),
    };
  },
  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`, {});
  },
  async markAllRead(): Promise<void> {
    await api.patch("/notifications/read-all", {});
  },
};
