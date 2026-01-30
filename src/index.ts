import express, { Request, Response } from 'express';
import { config } from './config';
import { WhatsAppAPI } from './whatsapp-api';
import { ReminderDatabase } from './database';
import { MessageHandler, WebhookMessage } from './message-handler';
import { ReminderScheduler } from './reminder-scheduler';

// Initialize components
console.log('WhatsApp Reminder Bot (Cloud API)');
console.log('==================================\n');

const db = new ReminderDatabase(config.database.path);
console.log('Database initialized');

const whatsappApi = new WhatsAppAPI(config.whatsapp);
console.log('WhatsApp API client initialized');

const messageHandler = new MessageHandler(whatsappApi, db);
const scheduler = new ReminderScheduler(whatsappApi, db);

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook verification (GET) - Meta sends this to verify your webhook
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request received');

  if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// Webhook for incoming messages (POST)
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Check if this is a WhatsApp message webhook
    if (body.object !== 'whatsapp_business_account') {
      res.sendStatus(404);
      return;
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') {
          continue;
        }

        const value = change.value;

        // Skip if no messages
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        // Process each message
        for (const message of value.messages) {
          console.log(`Received message from ${message.from}: ${message.type}`);

          // Convert to our message format and handle
          const webhookMessage: WebhookMessage = {
            from: message.from,
            id: message.id,
            timestamp: message.timestamp,
            type: message.type,
            text: message.text,
            interactive: message.interactive,
            context: message.context,
          };

          // Handle message asynchronously (don't block webhook response)
          messageHandler.handleMessage(webhookMessage).catch((error) => {
            console.error('Error handling message:', error);
          });
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Start the server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(`\nServer listening on http://${config.server.host}:${config.server.port}`);
  console.log(`Webhook URL: http://YOUR_DOMAIN:${config.server.port}/webhook\n`);

  // Start the reminder scheduler
  scheduler.start();
  console.log('Reminder scheduler started\n');

  console.log('Bot is ready to receive messages!');
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
