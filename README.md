# WhatsApp Reminder Bot

A WhatsApp bot that reminds you of messages - just like Slack's "Remind Me" feature!

Built with **Twilio** - no business verification, no extra phone needed.

## How It Works

1. You message the bot on WhatsApp
2. Bot asks when you want to be reminded
3. Pick a time (or type a custom one)
4. Bot sends you the reminder when the time comes!

---

## Setup Guide (Step by Step)

### Step 1: Create a Twilio Account

1. Go to **https://www.twilio.com/try-twilio**
2. Click **"Sign up"**
3. Fill in your details:
   - Email
   - Password
   - First name, Last name
4. Verify your email (check inbox, click the link)
5. Verify your phone number (Twilio sends a code)

You now have **$15 free credit** to test with!

---

### Step 2: Get Your Twilio Credentials

1. After signing up, you'll land on the **Twilio Console**
2. Look at the **"Account Info"** section on the dashboard
3. You'll see:
   - **Account SID** - starts with `AC` (copy this)
   - **Auth Token** - click "Show" to reveal, then copy

Save these somewhere - you'll need them soon.

---

### Step 3: Activate WhatsApp Sandbox

1. In the Twilio Console, click the search bar at the top
2. Type **"WhatsApp"** and select **"Messaging > Try it out > Send a WhatsApp message"**
   - Or go directly to: **https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn**
3. You'll see the **WhatsApp Sandbox** page
4. It shows a phone number like **+1 415 523 8886**
5. It also shows a code like **"join <something-something>"**

**Now, on your personal phone:**
1. Open WhatsApp
2. Add **+1 415 523 8886** (or the number shown) as a contact
3. Send the message: `join <the-code-shown>` (e.g., `join hungry-cat`)
4. You'll get a reply: "You're connected to the sandbox!"

**Congratulations!** You've linked your phone to the Twilio sandbox.

---

### Step 4: Install ngrok

ngrok creates a public URL for your local server (so Twilio can reach it).

**Option A: Download from website**
1. Go to **https://ngrok.com**
2. Sign up for free
3. Download for your OS
4. Unzip and install

**Option B: Install via npm**
```bash
npm install -g ngrok
```

**Option C: Install via package manager**
```bash
# macOS
brew install ngrok

# Linux (snap)
sudo snap install ngrok
```

**Get your ngrok auth token:**
1. Go to **https://dashboard.ngrok.com/get-started/your-authtoken**
2. Copy your authtoken
3. Run this command:
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

### Step 5: Download and Configure the Bot

```bash
# Clone the repository
git clone https://github.com/yourusername/WhatsAppReminer.git
cd WhatsAppReminer

# Install dependencies
npm install

# Create your config file
cp .env.example .env
```

**Edit the `.env` file** with your Twilio credentials:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

- `TWILIO_ACCOUNT_SID` = Your Account SID from Step 2
- `TWILIO_AUTH_TOKEN` = Your Auth Token from Step 2
- `TWILIO_WHATSAPP_NUMBER` = The sandbox number from Step 3 (usually +14155238886)

---

### Step 6: Start the Bot

**Terminal 1 - Start the bot:**
```bash
npm run build
npm start
```

You should see:
```
WhatsApp Reminder Bot (Twilio)
==============================

Database initialized
Twilio client initialized

Server listening on http://0.0.0.0:3000
```

**Terminal 2 - Start ngrok:**
```bash
ngrok http 3000
```

You'll see something like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy that `https://....ngrok-free.app` URL!**

---

### Step 7: Configure Twilio Webhook

1. Go back to Twilio Console
2. Navigate to: **Messaging > Try it out > Send a WhatsApp message**
   - Or: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. Scroll down to **"Sandbox Configuration"** (or click the "Sandbox settings" link)
4. Find **"When a message comes in"**
5. Enter your ngrok URL + `/webhook`:
   ```
   https://abc123.ngrok-free.app/webhook
   ```
6. Make sure the method is **POST**
7. Click **"Save"**

---

### Step 8: Test It!

1. Open WhatsApp on your phone
2. Send a message to the Twilio number: `Buy groceries`
3. The bot should reply asking when to remind you!
4. Reply with `1` (for 20 minutes) or type `in 2 hours`
5. Wait for your reminder!

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

## Troubleshooting

### "I sent a message but got no reply"
- Is your bot running? (`npm start`)
- Is ngrok running? (`ngrok http 3000`)
- Did you set the webhook URL in Twilio?
- Did you join the sandbox? (send `join xxx-xxx` to the Twilio number)

### "Sandbox expired"
The sandbox session expires after 72 hours of inactivity. Just send the `join xxx-xxx` message again.

### "Invalid credentials"
Double-check your `.env` file has the correct Account SID and Auth Token from Twilio Console.

### "ngrok URL changed"
Free ngrok URLs change every time you restart it. Update the webhook URL in Twilio Sandbox settings.

---

## Project Structure

```
WhatsAppReminer/
├── src/
│   ├── index.ts           # Express server & webhook
│   ├── config.ts          # Environment configuration
│   ├── twilio-client.ts   # Twilio API wrapper
│   ├── database.ts        # SQLite for reminders
│   ├── message-handler.ts # Message processing
│   ├── reminder-scheduler.ts # Sends due reminders
│   └── time-parser.ts     # Natural language time parsing
├── .env.example
├── package.json
└── README.md
```

---

## Costs

| What | Cost |
|------|------|
| Twilio signup | Free ($15 credit) |
| Per message sent | ~$0.005 |
| Per message received | ~$0.005 |
| ngrok (free tier) | Free |

$15 credit ≈ 1,500 messages. Plenty for personal use!

---

## Going to Production

For production (always-on, fixed URL):
1. Deploy to a server (Railway, Render, DigitalOcean, AWS, etc.)
2. Get a real domain or use the hosting provider's URL
3. Update Twilio webhook to your production URL
4. Consider upgrading from sandbox to a real Twilio WhatsApp number

---

## License

MIT
