import * as chrono from 'chrono-node';

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

export function getTimeSuggestions(referenceDate: Date = new Date()): TimeSuggestion[] {
  const suggestions: TimeSuggestion[] = [];
  const now = new Date(referenceDate);

  // In 20 minutes
  const in20Min = new Date(now);
  in20Min.setMinutes(in20Min.getMinutes() + 20);
  suggestions.push({
    label: 'In 20 minutes',
    value: in20Min,
    shortcut: '1',
  });

  // In 1 hour
  const in1Hour = new Date(now);
  in1Hour.setHours(in1Hour.getHours() + 1);
  suggestions.push({
    label: 'In 1 hour',
    value: in1Hour,
    shortcut: '2',
  });

  // In 3 hours
  const in3Hours = new Date(now);
  in3Hours.setHours(in3Hours.getHours() + 3);
  suggestions.push({
    label: 'In 3 hours',
    value: in3Hours,
    shortcut: '3',
  });

  // Tomorrow at 9 AM
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  suggestions.push({
    label: 'Tomorrow at 9:00 AM',
    value: tomorrow9am,
    shortcut: '4',
  });

  // Next Monday at 9 AM
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  suggestions.push({
    label: `Next Monday at 9:00 AM`,
    value: nextMonday,
    shortcut: '5',
  });

  // Next week (same day, same time)
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  suggestions.push({
    label: 'In 1 week',
    value: nextWeek,
    shortcut: '6',
  });

  return suggestions;
}

export function formatTimeSuggestions(suggestions: TimeSuggestion[]): string {
  const lines = suggestions.map((s) => {
    const formatted = formatDateTime(s.value);
    return `*${s.shortcut}*. ${s.label} (${formatted})`;
  });

  lines.push('');
  lines.push('Or reply with a custom time:');
  lines.push('- "in 30 minutes"');
  lines.push('- "tomorrow at 2pm"');
  lines.push('- "next friday at 10am"');
  lines.push('- "jan 15 at 3:30pm"');

  return lines.join('\n');
}

export function formatDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', options);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else {
    return formatDateTime(date);
  }
}
