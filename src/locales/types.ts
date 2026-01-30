export type Language = 'en' | 'he';

export interface Translations {
  // Language info
  languageName: string;
  languageCode: Language;

  // Commands
  commands: {
    help: string;
    list: string;
    delete: string;
    cancel: string;
    language: string;
  };

  // Help message
  help: {
    title: string;
    howToCreate: string;
    howToCreateDesc: string;
    commandsTitle: string;
    helpCmd: string;
    listCmd: string;
    deleteCmd: string;
    cancelCmd: string;
    languageCmd: string;
    timeFormatsTitle: string;
    timeFormats: string[];
  };

  // Reminder flow
  reminder: {
    setReminderFor: string;
    whenRemind: string;
    orTypeCustom: string;
    customExamples: string[];
    replyInstructions: string;
    cancelled: string;
    noPendingToCancel: string;
    invalidTime: string;
    invalidTimeExamples: string[];
    invalidTimeHint: string;
    pastTime: string;
    reminderSet: string;
    willRemindYou: string;
    reminderId: string;
  };

  // List reminders
  list: {
    noReminders: string;
    pendingTitle: string;
    deleteHint: string;
  };

  // Delete
  delete: {
    notFound: string;
    deleted: string;
    failed: string;
  };

  // Reminder notification
  notification: {
    title: string;
    originallyFrom: string;
    setOn: string;
  };

  // Language switching
  language: {
    changed: string;
    current: string;
    available: string;
    usage: string;
  };

  // Time suggestions
  time: {
    in20Minutes: string;
    in1Hour: string;
    in3Hours: string;
    tomorrowAt9: string;
    nextMondayAt9: string;
    in1Week: string;
    inMinutes: (n: number) => string;
    inHours: (n: number) => string;
    inDays: (n: number) => string;
  };
}
