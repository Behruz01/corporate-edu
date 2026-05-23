export type ApiSuccess<T> = T;

export type Branding = {
  logoUrl?: string;
  colors?: { primary?: string; accent?: string };
  platformName?: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  primaryLang: 'UZ' | 'RU' | 'EN';
  langs: Array<'UZ' | 'RU' | 'EN'>;
  branding: Branding | null;
};
