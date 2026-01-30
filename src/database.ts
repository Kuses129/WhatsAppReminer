import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
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
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;

  constructor(dbPath: string = path.join(process.cwd(), 'reminders.db')) {
    this.dbPath = dbPath;
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    // Try to load existing database
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId TEXT NOT NULL,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        originalSender TEXT,
        remindAt INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        sent INTEGER DEFAULT 0
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sent ON reminders(sent)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_userId ON reminders(userId)`);

    this.save();
  }

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  private save(): void {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  addReminder(
    chatId: string,
    userId: string,
    message: string,
    remindAt: Date,
    originalSender: string | null = null
  ): Reminder {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    this.db.run(
      `INSERT INTO reminders (chatId, userId, message, originalSender, remindAt, createdAt, sent)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [chatId, userId, message, originalSender, remindAt.getTime(), now]
    );

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0]?.[0] as number;

    this.save();

    return {
      id,
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
    if (!this.db) return [];

    const result = this.db.exec(
      `SELECT * FROM reminders WHERE sent = 0 AND remindAt <= ${Date.now()} ORDER BY remindAt ASC`
    );

    if (!result[0]) return [];

    return result[0].values.map((row: any[]) => this.rowToReminder(row, result[0].columns));
  }

  markAsSent(id: number): void {
    if (!this.db) return;
    this.db.run('UPDATE reminders SET sent = 1 WHERE id = ?', [id]);
    this.save();
  }

  deleteReminder(id: number): boolean {
    if (!this.db) return false;
    const before = this.db.exec(`SELECT COUNT(*) FROM reminders WHERE id = ${id}`);
    const countBefore = (before[0]?.values[0]?.[0] as number) || 0;

    this.db.run('DELETE FROM reminders WHERE id = ?', [id]);
    this.save();

    return countBefore > 0;
  }

  getUserReminders(userId: string): Reminder[] {
    if (!this.db) return [];

    // Use prepared statement style with sql.js
    const stmt = this.db.prepare(
      `SELECT * FROM reminders WHERE userId = ? AND sent = 0 ORDER BY remindAt ASC`
    );
    stmt.bind([userId]);

    const reminders: Reminder[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const columns = stmt.getColumnNames();
      reminders.push(this.rowToReminder(row, columns));
    }
    stmt.free();

    return reminders;
  }

  getNextReminder(): Reminder | null {
    if (!this.db) return null;

    const result = this.db.exec(
      `SELECT * FROM reminders WHERE sent = 0 ORDER BY remindAt ASC LIMIT 1`
    );

    if (!result[0] || !result[0].values[0]) return null;

    return this.rowToReminder(result[0].values[0], result[0].columns);
  }

  private rowToReminder(row: any[], columns: string[]): Reminder {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });

    return {
      id: obj.id,
      chatId: obj.chatId,
      userId: obj.userId,
      message: obj.message,
      originalSender: obj.originalSender,
      remindAt: obj.remindAt,
      createdAt: obj.createdAt,
      sent: Boolean(obj.sent),
    };
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}
