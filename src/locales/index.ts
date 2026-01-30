import { Language, Translations } from './types';
import { en } from './en';
import { he } from './he';

export { Language, Translations } from './types';

const translations: Record<Language, Translations> = {
  en,
  he,
};

export const DEFAULT_LANGUAGE: Language = 'en';

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}

export function isValidLanguage(lang: string): lang is Language {
  return lang === 'en' || lang === 'he';
}

export function getLocale(lang: Language): string {
  return lang === 'he' ? 'he-IL' : 'en-US';
}

export function formatDateTime(date: Date, lang: Language): string {
  const locale = getLocale(lang);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: lang === 'en',
  };

  return date.toLocaleString(locale, options);
}

export function formatRelativeTime(date: Date, lang: Language): string {
  const t = getTranslations(lang);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return t.time.inMinutes(diffMins);
  } else if (diffHours < 24) {
    return t.time.inHours(diffHours);
  } else if (diffDays < 7) {
    return t.time.inDays(diffDays);
  } else {
    return formatDateTime(date, lang);
  }
}
