import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import uzCommon from '@/i18n/locales/uz/common.json';
import uzAuth from '@/i18n/locales/uz/auth.json';
import uzKb from '@/i18n/locales/uz/kb.json';
import uzSimulator from '@/i18n/locales/uz/simulator.json';
import uzMemory from '@/i18n/locales/uz/memory.json';
import uzOnboarding from '@/i18n/locales/uz/onboarding.json';
import uzDashboard from '@/i18n/locales/uz/dashboard.json';
import uzGamification from '@/i18n/locales/uz/gamification.json';
import uzAdmin from '@/i18n/locales/uz/admin.json';
import uzVoice from '@/i18n/locales/uz/voice.json';
import uzNotifications from '@/i18n/locales/uz/notifications.json';
import ruCommon from '@/i18n/locales/ru/common.json';
import ruAuth from '@/i18n/locales/ru/auth.json';
import ruKb from '@/i18n/locales/ru/kb.json';
import ruSimulator from '@/i18n/locales/ru/simulator.json';
import ruMemory from '@/i18n/locales/ru/memory.json';
import ruOnboarding from '@/i18n/locales/ru/onboarding.json';
import ruDashboard from '@/i18n/locales/ru/dashboard.json';
import ruGamification from '@/i18n/locales/ru/gamification.json';
import ruAdmin from '@/i18n/locales/ru/admin.json';
import ruVoice from '@/i18n/locales/ru/voice.json';
import ruNotifications from '@/i18n/locales/ru/notifications.json';
import enCommon from '@/i18n/locales/en/common.json';
import enAuth from '@/i18n/locales/en/auth.json';
import enKb from '@/i18n/locales/en/kb.json';
import enSimulator from '@/i18n/locales/en/simulator.json';
import enMemory from '@/i18n/locales/en/memory.json';
import enOnboarding from '@/i18n/locales/en/onboarding.json';
import enDashboard from '@/i18n/locales/en/dashboard.json';
import enGamification from '@/i18n/locales/en/gamification.json';
import enAdmin from '@/i18n/locales/en/admin.json';
import enVoice from '@/i18n/locales/en/voice.json';
import enNotifications from '@/i18n/locales/en/notifications.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'kb', 'simulator', 'memory', 'onboarding', 'dashboard', 'gamification', 'admin', 'voice', 'notifications'],
    interpolation: { escapeValue: false },
    resources: {
      uz: { common: uzCommon, auth: uzAuth, kb: uzKb, simulator: uzSimulator, memory: uzMemory, onboarding: uzOnboarding, dashboard: uzDashboard, gamification: uzGamification, admin: uzAdmin, voice: uzVoice, notifications: uzNotifications },
      ru: { common: ruCommon, auth: ruAuth, kb: ruKb, simulator: ruSimulator, memory: ruMemory, onboarding: ruOnboarding, dashboard: ruDashboard, gamification: ruGamification, admin: ruAdmin, voice: ruVoice, notifications: ruNotifications },
      en: { common: enCommon, auth: enAuth, kb: enKb, simulator: enSimulator, memory: enMemory, onboarding: enOnboarding, dashboard: enDashboard, gamification: enGamification, admin: enAdmin, voice: enVoice, notifications: enNotifications },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
