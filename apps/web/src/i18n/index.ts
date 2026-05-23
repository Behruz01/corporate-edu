import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import uzCommon from '@/i18n/locales/uz/common.json';
import uzAuth from '@/i18n/locales/uz/auth.json';
import uzKb from '@/i18n/locales/uz/kb.json';
import ruCommon from '@/i18n/locales/ru/common.json';
import ruAuth from '@/i18n/locales/ru/auth.json';
import ruKb from '@/i18n/locales/ru/kb.json';
import enCommon from '@/i18n/locales/en/common.json';
import enAuth from '@/i18n/locales/en/auth.json';
import enKb from '@/i18n/locales/en/kb.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'kb'],
    interpolation: { escapeValue: false },
    resources: {
      uz: { common: uzCommon, auth: uzAuth, kb: uzKb },
      ru: { common: ruCommon, auth: ruAuth, kb: ruKb },
      en: { common: enCommon, auth: enAuth, kb: enKb },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
