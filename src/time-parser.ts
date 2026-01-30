import * as chrono from 'chrono-node';
import { Language, getTranslations } from './locales';

export interface TimeSuggestion {
  label: string;
  value: Date;
  shortcut: string;
}

export function parseTime(input: string, referenceDate: Date = new Date()): Date | null {
  // First try chrono for natural language parsing
  const results = chrono.parse(input, referenceDate, { forwardDate: true });

  if (results.length > 0) {
    return results[0].date();
  }

  // Try some custom patterns
  const customDate = parseCustomPatterns(input, referenceDate);
  if (customDate) {
    return customDate;
  }

  return null;
}

function parseCustomPatterns(input: string, referenceDate: Date): Date | null {
  const normalized = input.toLowerCase().trim();

  // Match patterns like "30m", "2h", "1d", "1w"
  const durationMatch = normalized.match(/^(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?|w|weeks?)$/);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].charAt(0);
    const date = new Date(referenceDate);

    switch (unit) {
      case 'm':
        date.setMinutes(date.getMinutes() + amount);
        break;
      case 'h':
        date.setHours(date.getHours() + amount);
        break;
      case 'd':
        date.setDate(date.getDate() + amount);
        break;
      case 'w':
        date.setDate(date.getDate() + amount * 7);
        break;
    }

    return date;
  }

  return null;
}

export function getTimeSuggestions(referenceDate: Date = new Date(), lang: Language = 'en'): TimeSuggestion[] {
  const t = getTranslations(lang);
  const suggestions: TimeSuggestion[] = [];
  const now = new Date(referenceDate);

  // In 20 minutes
  const in20Min = new Date(now);
  in20Min.setMinutes(in20Min.getMinutes() + 20);
  suggestions.push({
    label: t.time.in20Minutes,
    value: in20Min,
    shortcut: '1',
  });

  // In 1 hour
  const in1Hour = new Date(now);
  in1Hour.setHours(in1Hour.getHours() + 1);
  suggestions.push({
    label: t.time.in1Hour,
    value: in1Hour,
    shortcut: '2',
  });

  // In 3 hours
  const in3Hours = new Date(now);
  in3Hours.setHours(in3Hours.getHours() + 3);
  suggestions.push({
    label: t.time.in3Hours,
    value: in3Hours,
    shortcut: '3',
  });

  // Tomorrow at 9 AM
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  suggestions.push({
    label: t.time.tomorrowAt9,
    value: tomorrow9am,
    shortcut: '4',
  });

  // Next Monday at 9 AM
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  suggestions.push({
    label: t.time.nextMondayAt9,
    value: nextMonday,
    shortcut: '5',
  });

  // Next week (same day, same time)
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  suggestions.push({
    label: t.time.in1Week,
    value: nextWeek,
    shortcut: '6',
  });

  return suggestions;
}

export function formatTimeSuggestions(suggestions: TimeSuggestion[], lang: Language = 'en'): string {
  const t = getTranslations(lang);
  const lines = suggestions.map((s) => {
    const formatted = formatDateTime(s.value, lang);
    return `*${s.shortcut}*. ${s.label} (${formatted})`;
  });

  lines.push('');
  lines.push(t.reminder.orTypeCustom);
  t.reminder.customExamples.forEach((example) => {
    lines.push(`- ${example}`);
  });

  return lines.join('\n');
}

export function formatDateTime(date: Date, lang: Language = 'en'): string {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
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

export function formatRelativeTime(date: Date, lang: Language = 'en'): string {
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
