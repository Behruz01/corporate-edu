import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import uzCommon from './locales/uz/common.json';
import uzAuth from './locales/uz/auth.json';
import ruCommon from './locales/ru/common.json';
import ruAuth from './locales/ru/auth.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth'],
    interpolation: { escapeValue: false },
    resources: {
      uz: { common: uzCommon, auth: uzAuth },
      ru: { common: ruCommon, auth: ruAuth },
      en: { common: enCommon, auth: enAuth },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
