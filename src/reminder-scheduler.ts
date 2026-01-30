import { TwilioClient } from './twilio-client';
import { ReminderDatabase, Reminder } from './database';
import { formatDateTime } from './time-parser';

export class ReminderScheduler {
  private client: TwilioClient;
  private db: ReminderDatabase;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

  constructor(client: TwilioClient, db: ReminderDatabase) {
    this.client = client;
    this.db = db;
  }

  start(): void {
    console.log('Starting reminder scheduler...');

    // Check immediately on start
    this.checkAndSendReminders();

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, this.CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Reminder scheduler stopped');
  }

  private async checkAndSendReminders(): Promise<void> {
    try {
      const dueReminders = this.db.getDueReminders();

      if (dueReminders.length > 0) {
        console.log(`Found ${dueReminders.length} due reminder(s)`);
      }

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    try {
      const message = this.formatReminderMessage(reminder);

      await this.client.sendMessage(reminder.userId, message);

      this.db.markAsSent(reminder.id);
      console.log(`Sent reminder #${reminder.id} to ${reminder.userId}`);
    } catch (error) {
      console.error(`Failed to send reminder #${reminder.id}:`, error);
    }
  }

  private formatReminderMessage(reminder: Reminder): string {
    const lines: string[] = [];

    lines.push('⏰ *Reminder*');
    lines.push('');

    if (reminder.originalSender) {
      lines.push(`_Originally from: ${reminder.originalSender}_`);
      lines.push('');
    }

    lines.push(reminder.message);
    lines.push('');
    lines.push(`_Set on: ${formatDateTime(new Date(reminder.createdAt))}_`);

    return lines.join('\n');
  }
}
