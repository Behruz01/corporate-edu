import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores/auth-store';

export function HomePage(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">{t('nav.home')}</h1>
      <Card>
        <CardHeader><CardTitle>Hello, {user?.fullName}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Role: {user?.role}</p>
          <p>Tenant: {user?.tenantId}</p>
          <p>Preferred lang: {user?.preferredLang}</p>
          <p>Points: {user?.pointsTotal}</p>
        </CardContent>
      </Card>
    </div>
  );
}
