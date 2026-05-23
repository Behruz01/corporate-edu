import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateLang } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

const LANG_MAP = { uz: 'UZ', ru: 'RU', en: 'EN' } as const;

export function LangSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  async function change(lng: 'uz' | 'ru' | 'en'): Promise<void> {
    await i18n.changeLanguage(lng);
    if (user) {
      try {
        await updateLang(LANG_MAP[lng]);
        setUser({ ...user, preferredLang: LANG_MAP[lng] });
      } catch {
        /* keep UI lang even if server fails */
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {i18n.resolvedLanguage?.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void change('uz')}>{t('lang.uz')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void change('ru')}>{t('lang.ru')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void change('en')}>{t('lang.en')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
