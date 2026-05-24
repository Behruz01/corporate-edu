import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { INDUSTRIES, type TenantIndustry, fetchTenantSettings, updateTenantSettings } from './admin-api';

export function SettingsPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['admin', 'tenant-settings'], queryFn: fetchTenantSettings });
  const [platformName, setPlatformName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [industry, setIndustry] = useState<TenantIndustry>('banking');

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setPlatformName(settings.branding?.platformName ?? settings.name);
    setPrimaryColor(settings.branding?.colors?.primary ?? '#0f766e');
    setIndustry(isTenantIndustry(settings.industry) ? settings.industry : 'banking');
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-settings'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    updateMutation.mutate({ platformName: platformName.trim(), primaryColor, industry });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('settings.branding')}</CardTitle>
        </CardHeader>
        <CardContent>
          {settingsQuery.isLoading ? <div className="text-sm text-muted-foreground">{t('states.loading')}</div> : null}
          {settingsQuery.isError ? <div className="text-sm text-destructive">{t('states.error')}</div> : null}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <Field label={t('fields.platformName')} htmlFor="settings-platform-name">
              <Input id="settings-platform-name" value={platformName} required minLength={2} onChange={(event) => setPlatformName(event.target.value)} />
            </Field>
            <Field label={t('fields.primaryColor')} htmlFor="settings-primary-color">
              <div className="flex gap-2">
                <Input id="settings-primary-color" type="color" className="w-16 p-1" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
                <Input value={primaryColor} pattern="^#[0-9a-fA-F]{6}$" onChange={(event) => setPrimaryColor(event.target.value)} />
              </div>
            </Field>
            <Field label={t('fields.industry')} htmlFor="settings-industry">
              <select
                id="settings-industry"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={industry}
                onChange={(event) => setIndustry(event.target.value as TenantIndustry)}
              >
                {INDUSTRIES.map((item) => (
                  <option key={item} value={item}>{t(`industries.${item}`)}</option>
                ))}
              </select>
            </Field>
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground md:col-span-2">
              {t('settings.industryAgnostic')}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={updateMutation.isPending || !platformName.trim()}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {updateMutation.isPending ? t('actions.saving') : t('actions.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function isTenantIndustry(value: string): value is TenantIndustry {
  return INDUSTRIES.some((industry) => industry === value);
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
