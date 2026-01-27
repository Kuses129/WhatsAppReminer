import { Client, Message } from 'whatsapp-web.js';
import { ReminderDatabase } from './database';
import {
  parseTime,
  getTimeSuggestions,
  formatTimeSuggestions,
  formatDateTime,
  formatRelativeTime,
} from './time-parser';

interface PendingReminder {
  message: string;
  originalSender: string | null;
  timestamp: number;
}

export class MessageHandler {
  private client: Client;
  private db: ReminderDatabase;
  private pendingReminders: Map<string, PendingReminder> = new Map();
  private readonly PENDING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(client: Client, db: ReminderDatabase) {
    this.client = client;
    this.db = db;

    // Clean up expired pending reminders periodically
    setInterval(() => this.cleanupExpiredPending(), 60000);
  }

  async handleMessage(message: Message): Promise<void> {
    try {
      // Get the chat to determine if it's a private chat with the bot
      const chat = await message.getChat();
      const contact = await message.getContact();
      const userId = contact.id._serialized;
      const chatId = chat.id._serialized;

      // Only respond in private chats (not groups)
      if (chat.isGroup) {
        return;
      }

      const body = message.body.trim();

      // Check if user has a pending reminder waiting for time
      if (this.pendingReminders.has(userId)) {
        await this.handleTimeSelection(message, userId, chatId, body);
        return;
      }

      // Handle commands
      if (body.toLowerCase() === '/help' || body.toLowerCase() === 'help') {
        await this.sendHelp(message);
        return;
      }

      if (body.toLowerCase() === '/list' || body.toLowerCase() === 'list') {
        await this.listReminders(message, userId);
        return;
      }

      if (body.toLowerCase() === '/cancel' || body.toLowerCase() === 'cancel') {
        await message.reply('No pending reminder to cancel.');
        return;
      }

      // Check for delete command: /delete <id>
      const deleteMatch = body.match(/^\/delete\s+(\d+)$/i);
      if (deleteMatch) {
        await this.deleteReminder(message, userId, parseInt(deleteMatch[1], 10));
        return;
      }

      // Check if this is a forwarded message
      if (message.hasQuotedMsg || message.isForwarded) {
        await this.handleForwardedMessage(message, userId);
        return;
      }

      // Treat any other message as something to be reminded about
      await this.startReminderFlow(message, userId, body, null);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleForwardedMessage(message: Message, userId: string): Promise<void> {
    let reminderText: string;
    let originalSender: string | null = null;

    if (message.hasQuotedMsg) {
      // Message is a reply/quote
      const quotedMsg = await message.getQuotedMessage();
      reminderText = quotedMsg.body;

      try {
        const quotedContact = await quotedMsg.getContact();
        originalSender = quotedContact.pushname || quotedContact.number;
      } catch {
        // Ignore if we can't get the contact
      }
    } else {
      // Message is forwarded
      reminderText = message.body;
    }

    await this.startReminderFlow(message, userId, reminderText, originalSender);
  }

  private async startReminderFlow(
    message: Message,
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

    // Send time selection options
    const suggestions = getTimeSuggestions();
    const suggestionText = formatTimeSuggestions(suggestions);

    const previewText = reminderText.length > 100 ? reminderText.substring(0, 100) + '...' : reminderText;

    const response = `*Set a reminder for:*\n"${previewText}"\n\n*When should I remind you?*\n\n${suggestionText}\n\n_Reply with a number (1-6) or type a custom time. Send "cancel" to cancel._`;

    await message.reply(response);
  }

  private async handleTimeSelection(
    message: Message,
    userId: string,
    chatId: string,
    input: string
  ): Promise<void> {
    const pending = this.pendingReminders.get(userId);
    if (!pending) {
      return;
    }

    // Check for cancel
    if (input.toLowerCase() === 'cancel' || input.toLowerCase() === '/cancel') {
      this.pendingReminders.delete(userId);
      await message.reply('Reminder cancelled.');
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
      await message.reply(
        "I couldn't understand that time. Please try again with something like:\n" +
          '- "in 30 minutes"\n' +
          '- "tomorrow at 2pm"\n' +
          '- "next friday at 10am"\n\n' +
          'Or reply with a number (1-6) for a quick option.'
      );
      return;
    }

    // Check if the time is in the past
    if (selectedTime.getTime() <= Date.now()) {
      await message.reply("That time is in the past. Please choose a future time.");
      return;
    }

    // Create the reminder
    const reminder = this.db.addReminder(
      chatId,
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

    await message.reply(
      `*Reminder set!*\n\n` +
        `I'll remind you ${relativeTime}\n` +
        `_${formattedTime}_\n\n` +
        `Reminder ID: #${reminder.id}`
    );
  }

  private async sendHelp(message: Message): Promise<void> {
    const helpText = `*WhatsApp Reminder Bot*

*How to create a reminder:*
1. Forward a message to me, or
2. Simply send me any text

I'll then ask you when you want to be reminded.

*Commands:*
- *help* - Show this help message
- *list* - Show your pending reminders
- */delete <id>* - Delete a reminder by ID
- *cancel* - Cancel the current reminder setup

*Time formats I understand:*
- "in 30 minutes"
- "in 2 hours"
- "tomorrow at 9am"
- "next monday at 2pm"
- "jan 15 at 3:30pm"
- "3h" (3 hours)
- "1d" (1 day)`;

    await message.reply(helpText);
  }

  private async listReminders(message: Message, userId: string): Promise<void> {
    const reminders = this.db.getUserReminders(userId);

    if (reminders.length === 0) {
      await message.reply("You don't have any pending reminders.");
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

    await message.reply(lines.join('\n'));
  }

  private async deleteReminder(message: Message, userId: string, reminderId: number): Promise<void> {
    // Get user's reminders to verify ownership
    const reminders = this.db.getUserReminders(userId);
    const reminder = reminders.find((r) => r.id === reminderId);

    if (!reminder) {
      await message.reply(`Reminder #${reminderId} not found or doesn't belong to you.`);
      return;
    }

    const deleted = this.db.deleteReminder(reminderId);

    if (deleted) {
      await message.reply(`Reminder #${reminderId} has been deleted.`);
    } else {
      await message.reply(`Failed to delete reminder #${reminderId}.`);
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
