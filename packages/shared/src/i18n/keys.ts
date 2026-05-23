export const I18N_NAMESPACES = ['common', 'auth', 'onboarding', 'kb', 'simulator', 'memory', 'dashboard', 'admin'] as const;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const SUPPORTED_LANGS = ['uz', 'ru', 'en'] as const;
export type UiLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: UiLang = 'uz';
