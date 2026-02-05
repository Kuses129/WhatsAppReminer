import express, { Request, Response } from 'express';
import { config } from './config';
import { WahaClient } from './waha-client';
import { ReminderDatabase } from './database';
import { MessageHandler, WahaMessage } from './message-handler';
import { ReminderScheduler } from './reminder-scheduler';

async function main() {
  // Initialize components
  console.log('WhatsApp Reminder Bot (WAHA)');
  console.log('============================\n');

  const db = new ReminderDatabase(config.database.path);
  await db.waitForInit();
  console.log('Database initialized');

  const wahaClient = new WahaClient(config.waha);
  console.log(`WAHA client initialized (${config.waha.apiUrl}, session: ${config.waha.session})`);

  const messageHandler = new MessageHandler(wahaClient, db);
  const scheduler = new ReminderScheduler(wahaClient, db);

  // Create Express app
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint - helpful info
  app.get('/', (_req: Request, res: Response) => {
    res.send(`
      <h1>WhatsApp Reminder Bot</h1>
      <p>Bot is running with WAHA!</p>
      <p>Webhook URL: <code>POST /webhook</code></p>
      <p>Health check: <code>GET /health</code></p>
    `);
  });

  // WAHA webhook for incoming WhatsApp messages
  app.post('/webhook', async (req: Request, res: Response) => {
    try {
      const event = req.body;

      // Only process incoming messages (not our own)
      if (event.event !== 'message' && event.event !== 'message.any') {
        res.status(200).json({ ok: true });
        return;
      }

      const payload = event.payload;
      if (!payload) {
        res.status(200).json({ ok: true });
        return;
      }

      // Skip messages sent by us (the bot)
      if (payload.fromMe) {
        res.status(200).json({ ok: true });
        return;
      }

      // Skip non-text messages
      if (!payload.body) {
        res.status(200).json({ ok: true });
        return;
      }

      const message: WahaMessage = {
        id: payload.id || '',
        from: payload.from,
        fromMe: payload.fromMe,
        to: payload.to || '',
        body: payload.body || '',
        hasMedia: payload.hasMedia || false,
        timestamp: payload.timestamp || Date.now(),
      };

      console.log(`\nIncoming message from ${message.from}: ${message.body}`);

      // Handle message asynchronously
      messageHandler.handleMessage(message).catch((error) => {
        console.error('Error handling message:', error);
      });

      // Respond to WAHA immediately
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start the server
  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(`\nServer listening on http://${config.server.host}:${config.server.port}`);
    console.log(`\nWebhook URL for WAHA: http://<YOUR_BOT_HOST>:${config.server.port}/webhook\n`);

    // Start the reminder scheduler
    scheduler.start();
    console.log('Reminder scheduler started\n');

    console.log('Bot is ready! Link your WhatsApp in the WAHA dashboard, then send a message.\n');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    scheduler.stop();
    db.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
