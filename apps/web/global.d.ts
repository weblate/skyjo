import { BeforeInstallPromptEvent } from "@/types/beforeInstallPrompt";


declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

import {routing} from '@/i18n/routing';
import {formats} from '@/i18n/request';
type EnglishMessages = typeof import("./locales/en.json")
 
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: EnglishMessages;
    Formats: typeof formats;
  }
}