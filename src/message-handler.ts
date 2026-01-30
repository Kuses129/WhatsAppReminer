import { TwilioClient } from './twilio-client';
import { ReminderDatabase } from './database';
import {
  parseTime,
  getTimeSuggestions,
  formatDateTime,
  formatRelativeTime,
} from './time-parser';
import { Language, getTranslations, isValidLanguage } from './locales';

// Twilio webhook message format
export interface TwilioMessage {
  From: string; // e.g., "whatsapp:+1234567890"
  To: string;
  Body: string;
  MessageSid: string;
  NumMedia?: string;
}

interface PendingReminder {
  message: string;
  originalSender: string | null;
  timestamp: number;
}

export class MessageHandler {
  private client: TwilioClient;
  private db: ReminderDatabase;
  private pendingReminders: Map<string, PendingReminder> = new Map();
  private readonly PENDING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(client: TwilioClient, db: ReminderDatabase) {
    this.client = client;
    this.db = db;

    // Clean up expired pending reminders periodically
    setInterval(() => this.cleanupExpiredPending(), 60000);
  }

  private getUserLanguage(userId: string): Language {
    return this.db.getUserLanguage(userId);
  }

  async handleMessage(message: TwilioMessage): Promise<void> {
    try {
      const userId = TwilioClient.normalizePhoneNumber(message.From);
      const body = message.Body.trim();
      const lang = this.getUserLanguage(userId);

      console.log(`Message from ${userId}: ${body}`);

      // Check if user has a pending reminder waiting for time
      if (this.pendingReminders.has(userId)) {
        await this.handleTimeSelection(userId, body, lang);
        return;
      }

      // Handle commands
      const lowerBody = body.toLowerCase();

      if (lowerBody === '/help' || lowerBody === 'help') {
        await this.sendHelp(userId, lang);
        return;
      }

      if (lowerBody === '/list' || lowerBody === 'list') {
        await this.listReminders(userId, lang);
        return;
      }

      if (lowerBody === '/cancel' || lowerBody === 'cancel') {
        const t = getTranslations(lang);
        await this.client.sendMessage(userId, t.reminder.noPendingToCancel);
        return;
      }

      // Check for language command: /language <en|he>
      const langMatch = body.match(/^\/language\s*(\w*)$/i);
      if (langMatch) {
        await this.handleLanguageCommand(userId, langMatch[1], lang);
        return;
      }

      // Check for delete command: /delete <id>
      const deleteMatch = body.match(/^\/delete\s+(\d+)$/i);
      if (deleteMatch) {
        await this.deleteReminder(userId, parseInt(deleteMatch[1], 10), lang);
        return;
      }

      // Start the reminder flow with this message
      await this.startReminderFlow(userId, body, lang);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleLanguageCommand(userId: string, langArg: string, currentLang: Language): Promise<void> {
    const t = getTranslations(currentLang);

    if (!langArg) {
      // Show current language and usage
      await this.client.sendMessage(
        userId,
        `${t.language.current}\n${t.language.available}\n\n${t.language.usage}`
      );
      return;
    }

    const newLang = langArg.toLowerCase();
    if (!isValidLanguage(newLang)) {
      await this.client.sendMessage(
        userId,
        `${t.language.available}\n${t.language.usage}`
      );
      return;
    }

    // Set the new language
    this.db.setUserLanguage(userId, newLang);
    const newT = getTranslations(newLang);
    await this.client.sendMessage(userId, newT.language.changed);
  }

  private async startReminderFlow(userId: string, reminderText: string, lang: Language): Promise<void> {
    const t = getTranslations(lang);

    // Store the pending reminder
    this.pendingReminders.set(userId, {
      message: reminderText,
      originalSender: null,
      timestamp: Date.now(),
    });

    // Get time suggestions
    const suggestions = getTimeSuggestions(new Date(), lang);
    const previewText =
      reminderText.length > 100 ? reminderText.substring(0, 100) + '...' : reminderText;

    // Build the response with numbered options
    const lines = [
      t.reminder.setReminderFor,
      `"${previewText}"`,
      ``,
      t.reminder.whenRemind,
      ``,
    ];

    suggestions.forEach((s) => {
      lines.push(`*${s.shortcut}* - ${s.label}`);
    });

    lines.push(``);
    lines.push(t.reminder.orTypeCustom);
    t.reminder.customExamples.forEach((example) => {
      lines.push(`• ${example}`);
    });
    lines.push(``);
    lines.push(t.reminder.replyInstructions);

    await this.client.sendMessage(userId, lines.join('\n'));
  }

  private async handleTimeSelection(userId: string, input: string, lang: Language): Promise<void> {
    const t = getTranslations(lang);
    const pending = this.pendingReminders.get(userId);
    if (!pending) {
      return;
    }

    // Check for cancel
    if (input.toLowerCase() === 'cancel' || input.toLowerCase() === '/cancel') {
      this.pendingReminders.delete(userId);
      await this.client.sendMessage(userId, t.reminder.cancelled);
      return;
    }

    let selectedTime: Date | null = null;

    // Check if it's a shortcut number (1-6)
    const shortcutNum = parseInt(input, 10);
    if (shortcutNum >= 1 && shortcutNum <= 6) {
      const suggestions = getTimeSuggestions(new Date(), lang);
      const suggestion = suggestions.find((s) => s.shortcut === input);
      if (suggestion) {
        selectedTime = suggestion.value;
      }
    }

    // If not a shortcut, try to parse as natural language
    if (!selectedTime) {
      selectedTime = parseTime(input);
    }

    // Validate the time
    if (!selectedTime) {
      const errorLines = [
        t.reminder.invalidTime,
        ...t.reminder.invalidTimeExamples.map((ex) => `• ${ex}`),
        '',
        t.reminder.invalidTimeHint,
      ];
      await this.client.sendMessage(userId, errorLines.join('\n'));
      return;
    }

    // Check if the time is in the past
    if (selectedTime.getTime() <= Date.now()) {
      await this.client.sendMessage(userId, t.reminder.pastTime);
      return;
    }

    // Create the reminder
    const reminder = this.db.addReminder(
      userId,
      userId,
      pending.message,
      selectedTime,
      pending.originalSender
    );

    // Clear the pending state
    this.pendingReminders.delete(userId);

    // Confirm to user
    const formattedTime = formatDateTime(selectedTime, lang);
    const relativeTime = formatRelativeTime(selectedTime, lang);

    await this.client.sendMessage(
      userId,
      `${t.reminder.reminderSet}\n\n` +
        `${t.reminder.willRemindYou} ${relativeTime}\n` +
        `_${formattedTime}_\n\n` +
        `${t.reminder.reminderId} #${reminder.id}`
    );
  }

  private async sendHelp(userId: string, lang: Language): Promise<void> {
    const t = getTranslations(lang);
    const helpText = `${t.help.title}

${t.help.howToCreate}
${t.help.howToCreateDesc}

${t.help.commandsTitle}
• ${t.help.helpCmd}
• ${t.help.listCmd}
• ${t.help.deleteCmd}
• ${t.help.cancelCmd}
• ${t.help.languageCmd}

${t.help.timeFormatsTitle}
${t.help.timeFormats.map((f) => `• ${f}`).join('\n')}`;

    await this.client.sendMessage(userId, helpText);
  }

  private async listReminders(userId: string, lang: Language): Promise<void> {
    const t = getTranslations(lang);
    const reminders = this.db.getUserReminders(userId);

    if (reminders.length === 0) {
      await this.client.sendMessage(userId, t.list.noReminders);
      return;
    }

    const lines = [`${t.list.pendingTitle}\n`];

    for (const reminder of reminders) {
      const time = formatDateTime(new Date(reminder.remindAt), lang);
      const preview =
        reminder.message.length > 50 ? reminder.message.substring(0, 50) + '...' : reminder.message;

      lines.push(`*#${reminder.id}* - ${time}`);
      lines.push(`"${preview}"`);
      lines.push('');
    }

    lines.push(t.list.deleteHint);

    await this.client.sendMessage(userId, lines.join('\n'));
  }

  private async deleteReminder(userId: string, reminderId: number, lang: Language): Promise<void> {
    const t = getTranslations(lang);
    const reminders = this.db.getUserReminders(userId);
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      await this.client.sendMessage(
        userId,
        `#${reminderId} ${t.delete.notFound}`
      );
      return;
    }

    const deleted = this.db.deleteReminder(reminderId);

    if (deleted) {
      await this.client.sendMessage(userId, `${t.delete.deleted} #${reminderId}`);
    } else {
      await this.client.sendMessage(userId, `${t.delete.failed} #${reminderId}.`);
    }
  }

  private cleanupExpiredPending(): void {
    const now = Date.now();

    for (const [userId, pending] of this.pendingReminders) {
      if (now - pending.timestamp > this.PENDING_TIMEOUT_MS) {
        this.pendingReminders.delete(userId);
        console.log(`Cleaned up expired pending reminder for ${userId}`);
      }
    }
  }
}
