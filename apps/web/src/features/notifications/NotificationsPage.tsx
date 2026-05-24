import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from './api';

const NOTIFICATIONS_PAGE_QUERY_KEY = ['notifications', 'me'] as const;

export function NotificationsPage(): JSX.Element {
  const { t } = useTranslation('notifications');
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_PAGE_QUERY_KEY,
    queryFn: () => fetchNotifications(false),
    refetchInterval: 60_000,
  });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_PAGE_QUERY_KEY });
    },
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_PAGE_QUERY_KEY });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('unread', { count: unreadCount })}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => markAllReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          {t('markAllRead')}
        </Button>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {notificationsQuery.isLoading ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">...</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t('empty')}</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}): JSX.Element {
  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={cn(
          'mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
          notification.readAt ? 'bg-muted/30 text-muted-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{notification.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{notification.body}</span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleString()}
        </span>
      </span>
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-4">
      {notification.link ? (
        <Link
          to={notification.link}
          className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onMarkRead(notification.id)}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onMarkRead(notification.id)}
        >
          {content}
        </button>
      )}
      {!notification.readAt ? <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /> : null}
    </div>
  );
}
