import { WhatsAppAPI } from './whatsapp-api';
import { ReminderDatabase } from './database';
import {
  parseTime,
  getTimeSuggestions,
  formatDateTime,
  formatRelativeTime,
  TimeSuggestion,
} from './time-parser';

// Webhook payload types
export interface WebhookMessage {
  from: string; // sender's phone number
  id: string; // message ID
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  context?: {
    from: string;
    id: string;
    forwarded?: boolean;
    frequently_forwarded?: boolean;
  };
}

interface PendingReminder {
  message: string;
  originalSender: string | null;
  timestamp: number;
}

export class MessageHandler {
  private api: WhatsAppAPI;
  private db: ReminderDatabase;
  private pendingReminders: Map<string, PendingReminder> = new Map();
  private readonly PENDING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(api: WhatsAppAPI, db: ReminderDatabase) {
    this.api = api;
    this.db = db;

    // Clean up expired pending reminders periodically
    setInterval(() => this.cleanupExpiredPending(), 60000);
  }

  async handleMessage(message: WebhookMessage): Promise<void> {
    try {
      const userId = message.from;

      // Mark message as read
      await this.api.markAsRead(message.id);

      // Handle interactive button/list responses
      if (message.type === 'interactive' && message.interactive) {
        await this.handleInteractiveResponse(message, userId);
        return;
      }

      // Handle text messages
      if (message.type !== 'text' || !message.text) {
        await this.api.sendTextMessage(
          userId,
          "I can only handle text messages. Send me a message you'd like to be reminded about!"
        );
        return;
      }

      const body = message.text.body.trim();

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
        await this.api.sendTextMessage(userId, 'No pending reminder to cancel.');
        return;
      }

      // Check for delete command: /delete <id>
      const deleteMatch = body.match(/^\/delete\s+(\d+)$/i);
      if (deleteMatch) {
        await this.deleteReminder(userId, parseInt(deleteMatch[1], 10));
        return;
      }

      // Check if this is a forwarded message (has context)
      const isForwarded = message.context?.forwarded || message.context?.frequently_forwarded;

      // Start the reminder flow
      await this.startReminderFlow(userId, body, isForwarded ? 'Forwarded message' : null);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleInteractiveResponse(message: WebhookMessage, userId: string): Promise<void> {
    const interactive = message.interactive!;
    let selectedId: string | undefined;

    if (interactive.type === 'button_reply' && interactive.button_reply) {
      selectedId = interactive.button_reply.id;
    } else if (interactive.type === 'list_reply' && interactive.list_reply) {
      selectedId = interactive.list_reply.id;
    }

    if (!selectedId) {
      return;
    }

    // Check if it's a cancel action
    if (selectedId === 'cancel') {
      this.pendingReminders.delete(userId);
      await this.api.sendTextMessage(userId, 'Reminder cancelled.');
      return;
    }

    // Check if it's a time selection
    if (selectedId.startsWith('time_')) {
      const pending = this.pendingReminders.get(userId);
      if (!pending) {
        await this.api.sendTextMessage(userId, 'No pending reminder found. Send me a message to create one.');
        return;
      }

      const shortcut = selectedId.replace('time_', '');
      const suggestions = getTimeSuggestions();
      const suggestion = suggestions.find((s) => s.shortcut === shortcut);

      if (suggestion) {
        await this.createReminder(userId, pending, suggestion.value);
      }
      return;
    }

    // Check if it's a custom time request
    if (selectedId === 'custom_time') {
      await this.api.sendTextMessage(
        userId,
        'Type your custom time. Examples:\n' +
          '• "in 30 minutes"\n' +
          '• "tomorrow at 2pm"\n' +
          '• "next friday at 10am"\n' +
          '• "jan 15 at 3:30pm"'
      );
      return;
    }
  }

  private async startReminderFlow(
    userId: string,
    reminderText: string,
    originalSender: string | null
  ): Promise<void> {
    // Store the pending reminder
    this.pendingReminders.set(userId, {
      message: reminderText,
      originalSender,
      timestamp: Date.now(),
    });

    // Get time suggestions
    const suggestions = getTimeSuggestions();
    const previewText =
      reminderText.length > 100 ? reminderText.substring(0, 100) + '...' : reminderText;

    // Send interactive list with time options
    const bodyText = `*Set a reminder for:*\n"${previewText}"\n\nWhen should I remind you?`;

    await this.api.sendInteractiveList(userId, bodyText, 'Choose Time', [
      {
        title: 'Quick Options',
        rows: suggestions.slice(0, 6).map((s) => ({
          id: `time_${s.shortcut}`,
          title: s.label,
          description: formatDateTime(s.value),
        })),
      },
      {
        title: 'Other',
        rows: [
          {
            id: 'custom_time',
            title: 'Custom time',
            description: 'Type your own time',
          },
          {
            id: 'cancel',
            title: 'Cancel',
            description: 'Cancel this reminder',
          },
        ],
      },
    ]);
  }

  private async handleTimeSelection(userId: string, input: string): Promise<void> {
    const pending = this.pendingReminders.get(userId);
    if (!pending) {
      return;
    }

    // Check for cancel
    if (input.toLowerCase() === 'cancel' || input.toLowerCase() === '/cancel') {
      this.pendingReminders.delete(userId);
      await this.api.sendTextMessage(userId, 'Reminder cancelled.');
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
      await this.api.sendTextMessage(
        userId,
        "I couldn't understand that time. Please try again:\n" +
          '• "in 30 minutes"\n' +
          '• "tomorrow at 2pm"\n' +
          '• "next friday at 10am"\n\n' +
          'Or tap "Choose Time" above to pick an option.'
      );
      return;
    }

    // Check if the time is in the past
    if (selectedTime.getTime() <= Date.now()) {
      await this.api.sendTextMessage(userId, "That time is in the past. Please choose a future time.");
      return;
    }

    await this.createReminder(userId, pending, selectedTime);
  }

  private async createReminder(
    userId: string,
    pending: PendingReminder,
    selectedTime: Date
  ): Promise<void> {
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

    await this.api.sendTextMessage(
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
• "jan 15 at 3:30pm"`;

    await this.api.sendTextMessage(userId, helpText);
  }

  private async listReminders(userId: string): Promise<void> {
    const reminders = this.db.getUserReminders(userId);

    if (reminders.length === 0) {
      await this.api.sendTextMessage(userId, "You don't have any pending reminders.");
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

    await this.api.sendTextMessage(userId, lines.join('\n'));
  }

  private async deleteReminder(userId: string, reminderId: number): Promise<void> {
    const reminders = this.db.getUserReminders(userId);
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      await this.api.sendTextMessage(
        userId,
        `Reminder #${reminderId} not found or doesn't belong to you.`
      );
      return;
    }

    const deleted = this.db.deleteReminder(reminderId);

    if (deleted) {
      await this.api.sendTextMessage(userId, `✓ Reminder #${reminderId} deleted.`);
    } else {
      await this.api.sendTextMessage(userId, `Failed to delete reminder #${reminderId}.`);
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
