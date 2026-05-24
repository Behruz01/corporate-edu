import { api } from '@/lib/api/client';

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>('/me/notifications', {
    params: unreadOnly ? { unread: true } : undefined,
  });
  return data;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const { data } = await api.post<NotificationItem>(`/me/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data } = await api.post<{ updated: number }>('/me/notifications/mark-all-read');
  return data;
}

export async function seedDemoNotifications(): Promise<{ created: number; notifications: NotificationItem[] }> {
  const { data } = await api.post<{ created: number; notifications: NotificationItem[] }>('/me/notifications/seed-demo');
  return data;
}
