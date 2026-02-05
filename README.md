# WhatsApp Reminder Bot

A WhatsApp bot that reminds you of messages - just like Slack's "Remind Me" feature!

Built with **WAHA** (WhatsApp HTTP API) - use your own phone number, no business verification needed.

## How It Works

1. You run WAHA in Docker and scan a QR code with your phone
2. You message the bot on WhatsApp
3. Bot asks when you want to be reminded
4. Pick a time (or type a custom one)
5. Bot sends you the reminder when the time comes!

---

## Setup Guide (Step by Step)

### Prerequisites

- **Docker** installed ([Get Docker](https://docs.docker.com/get-docker/))
- **Node.js 18+** installed (if running the bot outside Docker)
- A phone with **WhatsApp** installed

---

### Option A: Docker Compose (Recommended)

This runs both WAHA and the bot together.

#### Step 1: Clone and Configure

```bash
git clone https://github.com/yourusername/WhatsAppReminer.git
cd WhatsAppReminer

# Create your config
cp .env.example .env
```

Edit `docker-compose.yml` and change `your_api_key_here` to a secure key (use the same value in both services).

#### Step 2: Start Everything

```bash
docker compose up -d
```

This starts:
- **WAHA** on port `3001` (WhatsApp API + Dashboard)
- **Bot** on port `3000` (your reminder bot)

#### Step 3: Link Your WhatsApp

1. Open the WAHA Dashboard: **http://localhost:3001/dashboard**
2. Start a new session (or use the "default" session)
3. A QR code will appear - scan it with your WhatsApp app
   - On your phone: WhatsApp > Settings > Linked Devices > Link a Device
4. Wait until the session status shows **WORKING**

#### Step 4: Test It!

Send a message from any WhatsApp contact to the number you just linked. The bot will respond!

---

### Option B: Run Locally (Development)

#### Step 1: Start WAHA

```bash
docker run -it --rm -p 3001:3000 \
  -e WAHA_API_KEY=your_api_key_here \
  -e WAHA_PRINT_QR=True \
  -e WHATSAPP_HOOK_URL=http://host.docker.internal:3000/webhook \
  -e WHATSAPP_HOOK_EVENTS=message,message.any \
  devlikeapro/waha
```

> On Linux, replace `host.docker.internal` with your machine's local IP (e.g., `192.168.1.x`).

#### Step 2: Link Your WhatsApp

1. Open **http://localhost:3001/dashboard**
2. Start the "default" session
3. Scan the QR code with your WhatsApp app
4. Wait for status: **WORKING**

#### Step 3: Configure and Start the Bot

```bash
cd WhatsAppReminer
npm install
cp .env.example .env
```

Edit `.env`:
```
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=your_api_key_here
WAHA_SESSION=default
```

Start the bot:
```bash
npm run build
npm start
```

You should see:
```
WhatsApp Reminder Bot (WAHA)
============================

Database initialized
WAHA client initialized (http://localhost:3001, session: default)

Server listening on http://0.0.0.0:3000
```

#### Step 4: Test It!

Send a WhatsApp message to the phone number you linked. The bot will respond!

---

## Usage

### Creating a Reminder

Send any message to the bot:
```
You: Call mom

Bot: *Set a reminder for:*
     "Call mom"

     *When should I remind you?*

     *1* - In 20 minutes
     *2* - In 1 hour
     *3* - In 3 hours
     *4* - Tomorrow at 9:00 AM
     *5* - Next Monday at 9:00 AM
     *6* - In 1 week

     Or type a custom time like:
     • "in 30 minutes"
     • "tomorrow at 2pm"

You: 2

Bot: ✓ *Reminder set!*
     I'll remind you in 1 hour
```

### Time Formats

The bot understands:
- Numbers: `1`, `2`, `3`, `4`, `5`, `6` (quick options)
- Relative: `in 30 minutes`, `in 2 hours`, `in 3 days`
- Short: `30m`, `2h`, `1d`, `1w`
- Absolute: `tomorrow at 9am`, `next monday at 2pm`
- Specific: `jan 15 at 3:30pm`

### Commands

| Command | What it does |
|---------|--------------|
| `help` | Show help |
| `list` | See your pending reminders |
| `/delete 5` | Delete reminder #5 |
| `cancel` | Cancel current setup |

---

## Project Structure

```
WhatsAppReminer/
├── src/
│   ├── index.ts              # Express server & webhook
│   ├── config.ts             # Environment configuration
│   ├── waha-client.ts        # WAHA HTTP API client
│   ├── database.ts           # SQLite for reminders
│   ├── message-handler.ts    # Message processing
│   ├── reminder-scheduler.ts # Sends due reminders
│   └── time-parser.ts        # Natural language time parsing
├── docker-compose.yml        # WAHA + Bot containers
├── Dockerfile                # Bot container image
├── .env.example
├── package.json
└── README.md
```

---

## Troubleshooting

### "I sent a message but got no reply"
- Is WAHA running? Check `http://localhost:3001/dashboard`
- Is the session status **WORKING**? If not, re-scan the QR code
- Is the bot running? (`npm start` or `docker compose logs bot`)
- Check bot logs for incoming webhook events

### "QR code expired"
QR codes expire after a short time. Refresh the dashboard and scan again.

### "Session disconnected"
Your phone may have gone offline or WhatsApp was updated. Open the WAHA dashboard and restart the session, then re-scan the QR code.

### "WAHA can't reach the bot webhook"
- If using Docker Compose: both containers share a network, so `http://bot:3000/webhook` should work
- If running locally: make sure the `WHATSAPP_HOOK_URL` uses your machine's IP, not `localhost` (from WAHA's perspective inside Docker, `localhost` is the container itself)

---

## Costs

| What | Cost |
|------|------|
| WAHA (Core) | Free, unlimited |
| Docker | Free |
| Your phone number | You already have one! |

No per-message fees. No API credits. Completely free for personal use.

---

## Going to Production

For production (always-on):
1. Deploy to a server (VPS, DigitalOcean, AWS, etc.)
2. Use `docker compose up -d` to run in background
3. Set up a reverse proxy (nginx/Caddy) with HTTPS
4. Change the `WAHA_API_KEY` to a strong secret
5. Consider WAHA Plus for multi-session support

---

## License

MIT
