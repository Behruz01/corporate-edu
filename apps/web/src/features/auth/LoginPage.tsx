import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, BookOpen, Drama, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { toast } from 'sonner';

export function LoginPage(): JSX.Element {
  const { t } = useTranslation(['auth', 'common']);
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user } = await login(email, password);
      setUser(user);
      nav(from, { replace: true });
    } catch {
      toast.error(t('login.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="bg-grain relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(700px 380px at 18% 12%, hsl(174 60% 38% / 0.35), transparent 60%), radial-gradient(560px 360px at 90% 100%, hsl(38 92% 50% / 0.18), transparent 55%)',
          }}
        />
        <div className="relative flex items-center gap-3 text-white">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-[hsl(185_47%_9%)] shadow-[0_4px_18px_hsl(38_92%_50%/0.4)]">
            CM
          </div>
          <div className="font-display text-xl font-bold tracking-tight text-white">
            {t('common:appName')}
          </div>
        </div>

        <div className="relative max-w-md rounded-2xl border border-white/10 bg-[hsl(185_47%_9%/0.42)] p-6 shadow-[0_24px_80px_hsl(185_55%_4%/0.35)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(185_47%_9%/0.34)] via-[hsl(185_47%_9%/0.16)] to-transparent" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-white/5 px-3 py-1 text-xs font-medium text-sidebar-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> AI-powered corporate learning
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white">
              Bilim. Mahorat.
              <br />
              <span className="text-brand">Tajriba saqlanadi.</span>
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              SQB Bank uchun adaptatsiya, bilim bazasi, AI roleplay simulyator va xodimlar
              tajribasini saqlovchi yagona platforma.
            </p>
            <div className="flex flex-col gap-3 pt-2 text-sm text-sidebar-foreground/85">
              <Feature icon={BookOpen} text="Hujjatlardan asoslangan bilim assistenti" />
              <Feature icon={Drama} text="AI bilan real vaziyat mashqi va baholash" />
              <Feature icon={Brain} text="Xodim tajribasini saqlovchi AI persona" />
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-5 top-5">
          <LangSwitcher />
        </div>
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <div className="font-display text-2xl font-bold tracking-tight text-primary">
              {t('common:appName')}
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {t('login.title')}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('login.subtitle')}</p>

          <form className="mt-8 space-y-5" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ism@sqb.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full shadow-glow" disabled={submitting}>
              {submitting ? '…' : t('login.submit')}
            </Button>
          </form>

          <p className="mt-6 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Demo: <span className="font-medium text-foreground">bekzod@sqb.uz</span> ·{' '}
            <span className="font-medium text-foreground">malika@sqb.uz</span> ·{' '}
            <span className="font-medium text-foreground">nigora@sqb.uz</span> — parol{' '}
            <span className="font-medium text-foreground">Demo123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof BookOpen; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
