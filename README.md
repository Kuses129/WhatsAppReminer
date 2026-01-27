# WhatsApp Reminder Bot

A WhatsApp bot that reminds you of messages - just like Slack's "Remind Me" feature!

## Features

- **Forward any message** to the bot and set a reminder
- **Quick time suggestions** - Choose from preset options (20 min, 1 hour, 3 hours, tomorrow, etc.)
- **Natural language time parsing** - "in 30 minutes", "tomorrow at 2pm", "next friday at 10am"
- **Persistent storage** - Reminders survive bot restarts (SQLite database)
- **Manage reminders** - List and delete your pending reminders

## How It Works

1. Send any message to the bot (or forward a message from another chat)
2. The bot asks when you want to be reminded with quick options
3. Choose a preset time or type a custom time
4. When the time comes, the bot sends you the reminder!

## Prerequisites

- Node.js 18 or higher
- A WhatsApp account
- Chrome/Chromium (automatically managed by puppeteer)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/WhatsAppReminer.git
cd WhatsAppReminer

# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm start
```

## First Run

On the first run, a QR code will appear in your terminal:

1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices > Link a Device
3. Scan the QR code
4. The bot is now connected!

Your session is saved locally, so you won't need to scan again unless you log out.

## Usage

### Creating a Reminder

**Option 1: Send a message directly**
```
You: Buy groceries
Bot: *Set a reminder for:*
     "Buy groceries"

     *When should I remind you?*

     *1*. In 20 minutes (Tue, Jan 28, 10:30 AM)
     *2*. In 1 hour (Tue, Jan 28, 11:10 AM)
     ...

You: 2
Bot: *Reminder set!*
     I'll remind you in 1 hour
```

**Option 2: Forward a message**
Simply forward any message from another chat to the bot, and it will ask when to remind you.

### Time Formats

The bot understands various time formats:

- Quick shortcuts: `1`, `2`, `3`, `4`, `5`, `6`
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
│   ├── index.ts           # Main entry point
│   ├── database.ts        # SQLite database for reminders
│   ├── message-handler.ts # Handles incoming messages
│   ├── reminder-scheduler.ts # Sends reminders when due
│   └── time-parser.ts     # Natural language time parsing
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Run in development mode with ts-node
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## How the Bot Works Internally

1. **Message Handler**: When you send a message, it's stored as a "pending reminder" and you're prompted for a time
2. **Time Parser**: Uses chrono-node for natural language parsing plus custom patterns
3. **Database**: SQLite stores all reminders with their scheduled times
4. **Scheduler**: Checks every 30 seconds for due reminders and sends them

## Limitations

- Only works in private chats (not groups)
- Requires the bot to be running for reminders to be sent
- WhatsApp Web session may need re-authentication periodically

## License

MIT
