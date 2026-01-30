import express, { Request, Response } from 'express';
import { config } from './config';
import { TwilioClient } from './twilio-client';
import { ReminderDatabase } from './database';
import { MessageHandler, TwilioMessage } from './message-handler';
import { ReminderScheduler } from './reminder-scheduler';

async function main() {
  // Initialize components
  console.log('WhatsApp Reminder Bot (Twilio)');
  console.log('==============================\n');

  const db = new ReminderDatabase(config.database.path);
  await db.waitForInit();
  console.log('Database initialized');

  const twilioClient = new TwilioClient(config.twilio);
  console.log('Twilio client initialized');

  const messageHandler = new MessageHandler(twilioClient, db);
  const scheduler = new ReminderScheduler(twilioClient, db);

  // Create Express app
  const app = express();

  // Parse URL-encoded bodies (Twilio sends data this way)
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint - helpful info
  app.get('/', (_req: Request, res: Response) => {
    res.send(`
      <h1>WhatsApp Reminder Bot</h1>
      <p>Bot is running!</p>
      <p>Webhook URL: <code>POST /webhook</code></p>
      <p>Health check: <code>GET /health</code></p>
    `);
  });

  // Twilio webhook for incoming WhatsApp messages
  app.post('/webhook', async (req: Request, res: Response) => {
    try {
      const message: TwilioMessage = {
        From: req.body.From,
        To: req.body.To,
        Body: req.body.Body || '',
        MessageSid: req.body.MessageSid,
        NumMedia: req.body.NumMedia,
      };

      console.log(`\nIncoming message from ${message.From}`);

      // Handle message asynchronously
      messageHandler.handleMessage(message).catch((error) => {
        console.error('Error handling message:', error);
      });

      // Respond to Twilio immediately (empty TwiML response)
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('<Response></Response>');
    }
  });

  // Start the server
  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(`\nServer listening on http://${config.server.host}:${config.server.port}`);
    console.log(`\nWebhook URL for Twilio: http://YOUR_NGROK_URL/webhook\n`);

    // Start the reminder scheduler
    scheduler.start();
    console.log('Reminder scheduler started\n');

    console.log('Bot is ready! Send a WhatsApp message to your Twilio number.\n');
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
