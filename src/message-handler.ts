import { TwilioClient } from './twilio-client';
import { ReminderDatabase } from './database';
import {
  parseTime,
  getTimeSuggestions,
  formatDateTime,
  formatRelativeTime,
} from './time-parser';

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

  async handleMessage(message: TwilioMessage): Promise<void> {
    try {
      const userId = TwilioClient.normalizePhoneNumber(message.From);
      const body = message.Body.trim();

      console.log(`Message from ${userId}: ${body}`);

      // Check if user has a pending reminder waiting for time
      if (this.pendingReminders.has(userId)) {
        await this.handleTimeSelection(userId, body);
        return;
      }

      // Handle commands
      const lowerBody = body.toLowerCase();

      if (lowerBody === '/help' || lowerBody === 'help') {
        await this.sendHelp(userId);
        return;
      }

      if (lowerBody === '/list' || lowerBody === 'list') {
        await this.listReminders(userId);
        return;
      }

      if (lowerBody === '/cancel' || lowerBody === 'cancel') {
        await this.client.sendMessage(userId, 'No pending reminder to cancel.');
        return;
      }

      // Check for delete command: /delete <id>
      const deleteMatch = body.match(/^\/delete\s+(\d+)$/i);
      if (deleteMatch) {
        await this.deleteReminder(userId, parseInt(deleteMatch[1], 10));
        return;
      }

      // Start the reminder flow with this message
      await this.startReminderFlow(userId, body);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async startReminderFlow(userId: string, reminderText: string): Promise<void> {
    // Store the pending reminder
    this.pendingReminders.set(userId, {
      message: reminderText,
      originalSender: null,
      timestamp: Date.now(),
    });

    // Get time suggestions
    const suggestions = getTimeSuggestions();
    const previewText =
      reminderText.length > 100 ? reminderText.substring(0, 100) + '...' : reminderText;

    // Build the response with numbered options
    const lines = [
      `*Set a reminder for:*`,
      `"${previewText}"`,
      ``,
      `*When should I remind you?*`,
      ``,
    ];

    suggestions.forEach((s) => {
      lines.push(`*${s.shortcut}* - ${s.label}`);
    });

    lines.push(``);
    lines.push(`Or type a custom time like:`);
    lines.push(`• "in 30 minutes"`);
    lines.push(`• "tomorrow at 2pm"`);
    lines.push(`• "next friday at 10am"`);
    lines.push(``);
    lines.push(`_Reply with a number (1-6) or type a time. Say "cancel" to cancel._`);

    await this.client.sendMessage(userId, lines.join('\n'));
  }

  private async handleTimeSelection(userId: string, input: string): Promise<void> {
    const pending = this.pendingReminders.get(userId);
    if (!pending) {
      return;
    }

    // Check for cancel
    if (input.toLowerCase() === 'cancel' || input.toLowerCase() === '/cancel') {
      this.pendingReminders.delete(userId);
      await this.client.sendMessage(userId, 'Reminder cancelled.');
      return;
    }

    let selectedTime: Date | null = null;

    // Check if it's a shortcut number (1-6)
    const shortcutNum = parseInt(input, 10);
    if (shortcutNum >= 1 && shortcutNum <= 6) {
      const suggestions = getTimeSuggestions();
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
      await this.client.sendMessage(
        userId,
        "I couldn't understand that time. Please try again:\n" +
          '• "in 30 minutes"\n' +
          '• "tomorrow at 2pm"\n' +
          '• "next friday at 10am"\n\n' +
          'Or reply with a number (1-6) for a quick option.'
      );
      return;
    }

    // Check if the time is in the past
    if (selectedTime.getTime() <= Date.now()) {
      await this.client.sendMessage(userId, "That time is in the past. Please choose a future time.");
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
    const formattedTime = formatDateTime(selectedTime);
    const relativeTime = formatRelativeTime(selectedTime);

    await this.client.sendMessage(
      userId,
      `✓ *Reminder set!*\n\n` +
        `I'll remind you ${relativeTime}\n` +
        `_${formattedTime}_\n\n` +
        `ID: #${reminder.id}`
    );
  }

  private async sendHelp(userId: string): Promise<void> {
    const helpText = `*WhatsApp Reminder Bot*

*How to create a reminder:*
Send me any message and I'll ask you when you want to be reminded.

*Commands:*
• *help* - Show this help
• *list* - Show pending reminders
• */delete <id>* - Delete a reminder
• *cancel* - Cancel current setup

*Time formats I understand:*
• "in 30 minutes"
• "in 2 hours"
• "tomorrow at 9am"
• "next monday at 2pm"
• "jan 15 at 3:30pm"
• Short: "30m", "2h", "1d"`;

    await this.client.sendMessage(userId, helpText);
  }

  private async listReminders(userId: string): Promise<void> {
    const reminders = this.db.getUserReminders(userId);

    if (reminders.length === 0) {
      await this.client.sendMessage(userId, "You don't have any pending reminders.");
      return;
    }

    const lines = ['*Your Pending Reminders:*\n'];

    for (const reminder of reminders) {
      const time = formatDateTime(new Date(reminder.remindAt));
      const preview =
        reminder.message.length > 50 ? reminder.message.substring(0, 50) + '...' : reminder.message;

      lines.push(`*#${reminder.id}* - ${time}`);
      lines.push(`"${preview}"`);
      lines.push('');
    }

    lines.push('_Use /delete <id> to remove a reminder_');

    await this.client.sendMessage(userId, lines.join('\n'));
  }

  private async deleteReminder(userId: string, reminderId: number): Promise<void> {
    const reminders = this.db.getUserReminders(userId);
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      await this.client.sendMessage(
        userId,
        `Reminder #${reminderId} not found or doesn't belong to you.`
      );
      return;
    }

    const deleted = this.db.deleteReminder(reminderId);

    if (deleted) {
      await this.client.sendMessage(userId, `✓ Reminder #${reminderId} deleted.`);
    } else {
      await this.client.sendMessage(userId, `Failed to delete reminder #${reminderId}.`);
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
