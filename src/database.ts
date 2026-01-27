import Database from 'better-sqlite3';
import path from 'path';

export interface Reminder {
  id: number;
  chatId: string;
  userId: string;
  message: string;
  originalSender: string | null;
  remindAt: number; // Unix timestamp in milliseconds
  createdAt: number;
  sent: boolean;
}

export class ReminderDatabase {
  private db: Database.Database;

  constructor(dbPath: string = path.join(process.cwd(), 'reminders.db')) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId TEXT NOT NULL,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        originalSender TEXT,
        remindAt INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        sent INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt);
      CREATE INDEX IF NOT EXISTS idx_sent ON reminders(sent);
      CREATE INDEX IF NOT EXISTS idx_userId ON reminders(userId);
    `);
  }

  addReminder(
    chatId: string,
    userId: string,
    message: string,
    remindAt: Date,
    originalSender: string | null = null
  ): Reminder {
    const stmt = this.db.prepare(`
      INSERT INTO reminders (chatId, userId, message, originalSender, remindAt, createdAt, sent)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    const now = Date.now();
    const result = stmt.run(chatId, userId, message, originalSender, remindAt.getTime(), now);

    return {
      id: result.lastInsertRowid as number,
      chatId,
      userId,
      message,
      originalSender,
      remindAt: remindAt.getTime(),
      createdAt: now,
      sent: false,
    };
  }

  getDueReminders(): Reminder[] {
    const stmt = this.db.prepare(`
      SELECT * FROM reminders
      WHERE sent = 0 AND remindAt <= ?
      ORDER BY remindAt ASC
    `);

    const rows = stmt.all(Date.now()) as any[];
    return rows.map(this.rowToReminder);
  }

  markAsSent(id: number): void {
    const stmt = this.db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?');
    stmt.run(id);
  }

  deleteReminder(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getUserReminders(userId: string): Reminder[] {
    const stmt = this.db.prepare(`
      SELECT * FROM reminders
      WHERE userId = ? AND sent = 0
      ORDER BY remindAt ASC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(this.rowToReminder);
  }

  getNextReminder(): Reminder | null {
    const stmt = this.db.prepare(`
      SELECT * FROM reminders
      WHERE sent = 0
      ORDER BY remindAt ASC
      LIMIT 1
    `);

    const row = stmt.get() as any;
    return row ? this.rowToReminder(row) : null;
  }

  private rowToReminder(row: any): Reminder {
    return {
      id: row.id,
      chatId: row.chatId,
      userId: row.userId,
      message: row.message,
      originalSender: row.originalSender,
      remindAt: row.remindAt,
      createdAt: row.createdAt,
      sent: Boolean(row.sent),
    };
  }

  close(): void {
    this.db.close();
  }
}
