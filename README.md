# WhatsApp Reminder Bot

A WhatsApp bot that reminds you of messages - just like Slack's "Remind Me" feature!

Built with the **official WhatsApp Cloud API** for reliability and scalability.

## Features

- **Forward any message** to the bot and set a reminder
- **Interactive time picker** - Tap to choose from preset options
- **Natural language time parsing** - "in 30 minutes", "tomorrow at 2pm", "next friday at 10am"
- **Persistent storage** - Reminders survive bot restarts (SQLite database)
- **Scalable** - Uses official Meta API, handles unlimited users

## How It Works

1. Send any message to the bot (or forward a message from another chat)
2. Bot shows an interactive menu with time options
3. Tap a preset time or type a custom time
4. When the time comes, the bot sends you the reminder!

## Prerequisites

- Node.js 18 or higher
- A Meta Developer account
- A publicly accessible server (for webhooks)

## Setup Guide

### Step 1: Create a Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in the app name and click "Create App"

### Step 2: Add WhatsApp to Your App

1. In your app dashboard, find "Add Products"
2. Click "Set up" on WhatsApp
3. You'll see the WhatsApp Getting Started page

### Step 3: Get Your Credentials

On the WhatsApp > API Setup page, you'll find:

1. **Phone number ID** - Under "From" phone number, click the dropdown and note the Phone Number ID
2. **Access Token** - Click "Generate" to create a temporary access token (valid for 24 hours)
   - For production, create a permanent System User token (see Meta docs)

### Step 4: Configure Webhook

Your server needs to be publicly accessible. Options:
- **Development**: Use [ngrok](https://ngrok.com/) to expose localhost
- **Production**: Deploy to a cloud server (AWS, DigitalOcean, Railway, etc.)

1. Start the bot (see below) or use ngrok: `ngrok http 3000`
2. In Meta App Dashboard, go to WhatsApp > Configuration
3. Click "Edit" on Webhooks
4. Enter your webhook URL: `https://YOUR_DOMAIN/webhook`
5. Enter your verify token (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in .env)
6. Click "Verify and Save"
7. Subscribe to "messages" webhook field

### Step 5: Install and Run

```bash
# Clone the repository
git clone https://github.com/yourusername/WhatsAppReminer.git
cd WhatsAppReminer

# Install dependencies
npm install

# Copy environment file and fill in your credentials
cp .env.example .env
# Edit .env with your values

# Build and run
npm run build
npm start
```

### Step 6: Test the Bot

1. In Meta App Dashboard, go to WhatsApp > API Setup
2. Add your phone number as a test recipient
3. Send a message to the test number shown in the dashboard
4. The bot should respond with time options!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `WHATSAPP_ACCESS_TOKEN` | Your WhatsApp API access token | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp phone number ID | Yes |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A secret string you create for webhook verification | Yes |
| `PORT` | Server port (default: 3000) | No |
| `HOST` | Server host (default: 0.0.0.0) | No |
| `DATABASE_PATH` | SQLite database path (default: ./reminders.db) | No |

## Usage

### Creating a Reminder

Send any text message to the bot:

```
You: Buy groceries

Bot: *Set a reminder for:*
     "Buy groceries"

     When should I remind you?

     [Choose Time button - shows interactive list]
```

Tap "Choose Time" to see options:
- In 20 minutes
- In 1 hour
- In 3 hours
- Tomorrow at 9:00 AM
- Next Monday at 9:00 AM
- In 1 week
- Custom time
- Cancel

### Time Formats

The bot understands:
- Quick shortcuts: Tap from the interactive list
- Relative: `in 30 minutes`, `in 2 hours`, `in 3 days`
- Short form: `30m`, `2h`, `1d`, `1w`
- Absolute: `tomorrow at 9am`, `next monday at 2pm`
- Specific: `jan 15 at 3:30pm`, `december 25 at noon`

### Commands

| Command | Description |
|---------|-------------|
| `help` | Show help message |
| `list` | Show your pending reminders |
| `/delete <id>` | Delete a reminder by ID |
| `cancel` | Cancel current reminder setup |

## Project Structure

```
WhatsAppReminer/
├── src/
│   ├── index.ts           # Express server & webhook handling
│   ├── config.ts          # Environment configuration
│   ├── whatsapp-api.ts    # WhatsApp Cloud API client
│   ├── database.ts        # SQLite database for reminders
│   ├── message-handler.ts # Message processing logic
│   ├── reminder-scheduler.ts # Sends reminders when due
│   └── time-parser.ts     # Natural language time parsing
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## Production Deployment

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Permanent Access Token

For production, create a System User token:
1. Go to Business Settings > System Users
2. Create a new System User
3. Add the WhatsApp app with full_control permission
4. Generate a token - this won't expire

### Scaling Considerations

- **Database**: For high volume, migrate from SQLite to PostgreSQL
- **Horizontal scaling**: Use Redis for session state to run multiple instances
- **Rate limits**: Cloud API has generous limits, but implement backoff for errors

## Pricing

WhatsApp Cloud API pricing (as of 2024):
- **Free**: First 1,000 conversations per month
- **User-initiated**: ~$0.005-0.08 per conversation (varies by country)
- **Business-initiated**: ~$0.03-0.15 per conversation

A "conversation" is a 24-hour messaging window, not per message.

## Troubleshooting

### Webhook not receiving messages
- Ensure your server is publicly accessible
- Check that you've subscribed to the "messages" field
- Verify the webhook token matches your .env

### "Invalid access token" error
- Temporary tokens expire after 24 hours
- Generate a new token or set up a System User token

### Bot not responding
- Check server logs for errors
- Ensure the phone number is added to test recipients (for sandbox)

## License

MIT
