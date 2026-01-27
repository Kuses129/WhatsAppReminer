import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { ReminderDatabase } from './database';
import { MessageHandler } from './message-handler';
import { ReminderScheduler } from './reminder-scheduler';

console.log('WhatsApp Reminder Bot');
console.log('====================\n');

// Initialize database
const db = new ReminderDatabase();
console.log('Database initialized');

// Initialize WhatsApp client with local authentication
// This saves the session so you don't need to scan QR code every time
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth',
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

// Initialize handlers
const messageHandler = new MessageHandler(client, db);
const scheduler = new ReminderScheduler(client, db);

// QR Code event - scan this with WhatsApp to authenticate
client.on('qr', (qr) => {
  console.log('\nScan this QR code with WhatsApp to log in:\n');
  qrcode.generate(qr, { small: true });
  console.log('\nWaiting for authentication...\n');
});

// Authentication successful
client.on('authenticated', () => {
  console.log('Authentication successful!');
});

// Client is ready
client.on('ready', () => {
  console.log('\nWhatsApp Reminder Bot is ready!');
  console.log('Send a message or forward a message to this number to set a reminder.\n');

  // Start the reminder scheduler
  scheduler.start();
});

// Handle incoming messages
client.on('message', async (message) => {
  // Ignore messages from yourself
  if (message.fromMe) {
    return;
  }

  await messageHandler.handleMessage(message);
});

// Handle authentication failures
client.on('auth_failure', (msg) => {
  console.error('Authentication failed:', msg);
  process.exit(1);
});

// Handle disconnection
client.on('disconnected', (reason) => {
  console.log('Client disconnected:', reason);
  scheduler.stop();
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down...');
  scheduler.stop();
  db.close();
  await client.destroy();
  console.log('Goodbye!');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the client
console.log('Initializing WhatsApp client...');
console.log('(This may take a moment on first run)\n');

client.initialize().catch((error) => {
  console.error('Failed to initialize client:', error);
  process.exit(1);
});
