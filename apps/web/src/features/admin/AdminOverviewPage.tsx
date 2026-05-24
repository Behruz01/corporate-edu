import { FileText, FolderKanban, GraduationCap, Settings, UsersRound, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const LINKS = [
  { to: '/admin/users', key: 'users.title', icon: UsersRound },
  { to: '/admin/documents', key: 'documents.title', icon: FileText },
  { to: '/admin/scenarios', key: 'scenarios.title', icon: Workflow },
  { to: '/admin/onboarding', key: 'onboarding.title', icon: GraduationCap },
  { to: '/admin/projects', key: 'projects.title', icon: FolderKanban },
  { to: '/admin/settings', key: 'settings.title', icon: Settings },
] as const;

export function AdminOverviewPage(): JSX.Element {
  const { t } = useTranslation('admin');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('overview.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('overview.subtitle')}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="rounded-lg transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{t(item.key)}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
