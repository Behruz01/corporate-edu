import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import uzCommon from '@/i18n/locales/uz/common.json';
import uzAuth from '@/i18n/locales/uz/auth.json';
import uzKb from '@/i18n/locales/uz/kb.json';
import uzSimulator from '@/i18n/locales/uz/simulator.json';
import uzMemory from '@/i18n/locales/uz/memory.json';
import ruCommon from '@/i18n/locales/ru/common.json';
import ruAuth from '@/i18n/locales/ru/auth.json';
import ruKb from '@/i18n/locales/ru/kb.json';
import ruSimulator from '@/i18n/locales/ru/simulator.json';
import ruMemory from '@/i18n/locales/ru/memory.json';
import enCommon from '@/i18n/locales/en/common.json';
import enAuth from '@/i18n/locales/en/auth.json';
import enKb from '@/i18n/locales/en/kb.json';
import enSimulator from '@/i18n/locales/en/simulator.json';
import enMemory from '@/i18n/locales/en/memory.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'kb', 'simulator', 'memory'],
    interpolation: { escapeValue: false },
    resources: {
      uz: { common: uzCommon, auth: uzAuth, kb: uzKb, simulator: uzSimulator, memory: uzMemory },
      ru: { common: ruCommon, auth: ruAuth, kb: ruKb, simulator: ruSimulator, memory: ruMemory },
      en: { common: enCommon, auth: enAuth, kb: enKb, simulator: enSimulator, memory: enMemory },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
