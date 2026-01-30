import { Translations } from './types';

export const en: Translations = {
  languageName: 'English',
  languageCode: 'en',

  commands: {
    help: 'help',
    list: 'list',
    delete: 'delete',
    cancel: 'cancel',
    language: 'language',
  },

  help: {
    title: '*WhatsApp Reminder Bot*',
    howToCreate: '*How to create a reminder:*',
    howToCreateDesc: "Send me any message and I'll ask you when you want to be reminded.",
    commandsTitle: '*Commands:*',
    helpCmd: '*help* - Show this help',
    listCmd: '*list* - Show pending reminders',
    deleteCmd: '*/delete <id>* - Delete a reminder',
    cancelCmd: '*cancel* - Cancel current setup',
    languageCmd: '*/language <en|he>* - Change language',
    timeFormatsTitle: '*Time formats I understand:*',
    timeFormats: [
      '"in 30 minutes"',
      '"in 2 hours"',
      '"tomorrow at 9am"',
      '"next monday at 2pm"',
      '"jan 15 at 3:30pm"',
      'Short: "30m", "2h", "1d"',
    ],
  },

  reminder: {
    setReminderFor: '*Set a reminder for:*',
    whenRemind: '*When should I remind you?*',
    orTypeCustom: 'Or type a custom time like:',
    customExamples: ['"in 30 minutes"', '"tomorrow at 2pm"', '"next friday at 10am"'],
    replyInstructions: '_Reply with a number (1-6) or type a time. Say "cancel" to cancel._',
    cancelled: 'Reminder cancelled.',
    noPendingToCancel: 'No pending reminder to cancel.',
    invalidTime: "I couldn't understand that time. Please try again:",
    invalidTimeExamples: ['"in 30 minutes"', '"tomorrow at 2pm"', '"next friday at 10am"'],
    invalidTimeHint: 'Or reply with a number (1-6) for a quick option.',
    pastTime: 'That time is in the past. Please choose a future time.',
    reminderSet: '✓ *Reminder set!*',
    willRemindYou: "I'll remind you",
    reminderId: 'ID:',
  },

  list: {
    noReminders: "You don't have any pending reminders.",
    pendingTitle: '*Your Pending Reminders:*',
    deleteHint: '_Use /delete <id> to remove a reminder_',
  },

  delete: {
    notFound: "not found or doesn't belong to you.",
    deleted: '✓ Reminder deleted.',
    failed: 'Failed to delete reminder',
  },

  notification: {
    title: '⏰ *Reminder*',
    originallyFrom: '_Originally from:_',
    setOn: '_Set on:_',
  },

  language: {
    changed: '✓ Language changed to English.',
    current: 'Current language: English',
    available: 'Available languages: en (English), he (Hebrew)',
    usage: 'Usage: /language <en|he>',
  },

  time: {
    in20Minutes: 'In 20 minutes',
    in1Hour: 'In 1 hour',
    in3Hours: 'In 3 hours',
    tomorrowAt9: 'Tomorrow at 9:00 AM',
    nextMondayAt9: 'Next Monday at 9:00 AM',
    in1Week: 'In 1 week',
    inMinutes: (n: number) => `in ${n} minute${n !== 1 ? 's' : ''}`,
    inHours: (n: number) => `in ${n} hour${n !== 1 ? 's' : ''}`,
    inDays: (n: number) => `in ${n} day${n !== 1 ? 's' : ''}`,
  },
};
