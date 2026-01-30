import { Translations } from './types';

export const he: Translations = {
  languageName: 'עברית',
  languageCode: 'he',

  commands: {
    help: 'עזרה',
    list: 'רשימה',
    delete: 'מחק',
    cancel: 'ביטול',
    language: 'שפה',
  },

  help: {
    title: '*בוט תזכורות לוואטסאפ*',
    howToCreate: '*איך ליצור תזכורת:*',
    howToCreateDesc: 'שלח לי הודעה כלשהי ואשאל אותך מתי להזכיר לך.',
    commandsTitle: '*פקודות:*',
    helpCmd: '*help* - הצג עזרה זו',
    listCmd: '*list* - הצג תזכורות ממתינות',
    deleteCmd: '*/delete <מספר>* - מחק תזכורת',
    cancelCmd: '*cancel* - בטל הגדרה נוכחית',
    languageCmd: '*/language <en|he>* - שנה שפה',
    timeFormatsTitle: '*פורמטי זמן שאני מבין:*',
    timeFormats: [
      '"in 30 minutes"',
      '"in 2 hours"',
      '"tomorrow at 9am"',
      '"next monday at 2pm"',
      '"jan 15 at 3:30pm"',
      'קיצורים: "30m", "2h", "1d"',
    ],
  },

  reminder: {
    setReminderFor: '*הגדר תזכורת עבור:*',
    whenRemind: '*מתי להזכיר לך?*',
    orTypeCustom: 'או הקלד זמן מותאם אישית כמו:',
    customExamples: ['"in 30 minutes"', '"tomorrow at 2pm"', '"next friday at 10am"'],
    replyInstructions: '_השב עם מספר (1-6) או הקלד זמן. אמור "cancel" לביטול._',
    cancelled: 'התזכורת בוטלה.',
    noPendingToCancel: 'אין תזכורת ממתינה לביטול.',
    invalidTime: 'לא הצלחתי להבין את הזמן. נסה שוב:',
    invalidTimeExamples: ['"in 30 minutes"', '"tomorrow at 2pm"', '"next friday at 10am"'],
    invalidTimeHint: 'או השב עם מספר (1-6) לאפשרות מהירה.',
    pastTime: 'הזמן הזה בעבר. אנא בחר זמן עתידי.',
    reminderSet: '✓ *התזכורת נקבעה!*',
    willRemindYou: 'אזכיר לך',
    reminderId: 'מזהה:',
  },

  list: {
    noReminders: 'אין לך תזכורות ממתינות.',
    pendingTitle: '*התזכורות הממתינות שלך:*',
    deleteHint: '_השתמש ב-/delete <מספר> כדי להסיר תזכורת_',
  },

  delete: {
    notFound: 'לא נמצאה או לא שייכת לך.',
    deleted: '✓ התזכורת נמחקה.',
    failed: 'נכשל במחיקת תזכורת',
  },

  notification: {
    title: '⏰ *תזכורת*',
    originallyFrom: '_במקור מאת:_',
    setOn: '_נקבעה בתאריך:_',
  },

  language: {
    changed: '✓ השפה שונתה לעברית.',
    current: 'שפה נוכחית: עברית',
    available: 'שפות זמינות: en (אנגלית), he (עברית)',
    usage: 'שימוש: /language <en|he>',
  },

  time: {
    in20Minutes: 'בעוד 20 דקות',
    in1Hour: 'בעוד שעה',
    in3Hours: 'בעוד 3 שעות',
    tomorrowAt9: 'מחר ב-9:00 בבוקר',
    nextMondayAt9: 'יום שני הבא ב-9:00 בבוקר',
    in1Week: 'בעוד שבוע',
    inMinutes: (n: number) => `בעוד ${n} ${n === 1 ? 'דקה' : 'דקות'}`,
    inHours: (n: number) => `בעוד ${n} ${n === 1 ? 'שעה' : 'שעות'}`,
    inDays: (n: number) => `בעוד ${n} ${n === 1 ? 'יום' : 'ימים'}`,
  },
};
