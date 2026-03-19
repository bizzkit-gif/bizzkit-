# Bizzkit — Setup Guide
## From zero to live on your phone in ~30 minutes

---

## What you'll need
- Your laptop (Mac, Windows, or Linux)
- Node.js installed — download free at **nodejs.org** (choose the LTS version)
- A free Supabase account
- A free Daily.co account (for video calls)
- A free Vercel account (to put it online)

---

## STEP 1 — Install Node.js

1. Go to **nodejs.org**
2. Download the **LTS** version
3. Run the installer, click through all the defaults
4. Open Terminal (Mac) or Command Prompt (Windows)
5. Type `node --version` and press Enter — you should see something like `v20.11.0`

---

## STEP 2 — Set up Supabase (your database)

1. Go to **supabase.com** and click **Start your project** — sign up free
2. Click **New project**
3. Give it a name: `bizzkit`
4. Set a **Database Password** — save this somewhere safe
5. Choose the region closest to you (e.g. Europe West for UK/UAE)
6. Click **Create new project** — wait ~2 minutes for it to set up

### Run the database schema

7. In your Supabase dashboard, click **SQL Editor** in the left sidebar
8. Click **New query**
9. Open the file `supabase/schema.sql` from this project folder
10. Copy the entire contents and paste it into the SQL editor
11. Click **Run** (the green button)
12. You should see "Success. No rows returned" — that means it worked ✅

### Get your API keys

13. In Supabase, click **Settings** (gear icon) in the left sidebar
14. Click **API**
15. You'll see two things you need:
    - **Project URL** — looks like `https://abcdefg.supabase.co`
    - **anon public** key — a long string starting with `eyJ...`
16. Copy both — you'll need them in Step 4

---

## STEP 3 — Set up Daily.co (video calls)

1. Go to **daily.co** and sign up free
2. Once inside the dashboard, you'll see your **domain** — it looks like `yourname.daily.co` — copy this
3. Click **Developers** in the left sidebar
4. Click **API Keys**
5. Copy the API key shown — it's a long string

> **Note:** If you skip this step, the app will still work but video calls won't function.
> You can always add it later.

---

## STEP 4 — Configure your environment

1. Open the `bizzkit-real` project folder on your laptop
2. Find the file called `.env.example`
3. Make a copy of it and rename the copy to `.env`
4. Open `.env` in any text editor (Notepad on Windows, TextEdit on Mac)
5. Fill in your values:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-actual-anon-key-here
VITE_DAILY_API_KEY=your-daily-api-key
VITE_DAILY_DOMAIN=yourname.daily.co
```

6. Save the file

---

## STEP 5 — Install and run the app

Open Terminal (Mac) or Command Prompt (Windows):

```bash
# Navigate to the project folder
# Replace the path below with wherever you saved the project
cd /path/to/bizzkit-real

# Install all dependencies (takes ~1 minute)
npm install

# Start the app
npm run dev
```

The app will open at **http://localhost:3000** in your browser.

### Open it on your phone (same WiFi)

While `npm run dev` is running:

1. On your laptop, find your local IP address:
   - **Mac:** Open Terminal, type `ipconfig getifaddr en0`
   - **Windows:** Open CMD, type `ipconfig`, look for "IPv4 Address"
   - It looks like `192.168.1.45`

2. On your phone (connected to same WiFi), open Safari or Chrome
3. Type `http://192.168.1.45:3000` (replace with your actual IP)
4. The app will open on your phone! 📱

---

## STEP 6 — Deploy live so anyone can access it

This makes your app available at a real URL from any phone, anywhere.

### Deploy to Vercel (free, takes 5 minutes)

1. Go to **github.com** and create a free account if you don't have one
2. Create a new repository called `bizzkit`
3. Upload your `bizzkit-real` project folder to it (drag and drop on GitHub)

4. Go to **vercel.com** and sign up free (use your GitHub account)
5. Click **Add New Project**
6. Select your `bizzkit` repository
7. Click **Environment Variables** and add all 4 variables from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DAILY_API_KEY`
   - `VITE_DAILY_DOMAIN`
8. Click **Deploy**
9. Wait ~2 minutes — Vercel gives you a URL like `https://bizzkit.vercel.app`

**Share that URL with anyone** — they can sign up and use the app from any device. 🌍

---

## STEP 7 — Add to iPhone home screen

1. Open your Vercel URL in Safari on iPhone
2. Tap the **Share button** (box with arrow) at the bottom
3. Tap **Add to Home Screen**
4. Tap **Add**
5. It now appears as an app icon on your home screen ✅

---

## Testing real-time features

To test messaging and video calls between two real phones:

1. Open the app on **Phone A** — create an account and business profile
2. Open the app on **Phone B** — create a different account and business profile
3. On Phone A, find Phone B's business in the Feed and tap **Connect**
4. Both phones now have a chat thread in Messages
5. Send a message from Phone A — it appears instantly on Phone B (real-time! ✅)
6. Tap the 📞 button in the chat to start a video call — Phone B gets notified
7. Phone B opens the chat and taps 📞 to join the call

---

## Troubleshooting

**"Missing Supabase environment variables"**
→ Check your `.env` file exists (not `.env.example`) and has the real values filled in

**Messages not appearing in real-time**
→ In Supabase → Database → Replication, make sure the `messages` table is enabled

**Video call button does nothing**
→ Check your `VITE_DAILY_API_KEY` and `VITE_DAILY_DOMAIN` are correct in `.env`

**App won't install (`npm install` fails)**
→ Make sure Node.js is installed: run `node --version` in Terminal first

**Can't access from phone on WiFi**
→ Make sure both devices are on the same WiFi network, and check your laptop's firewall settings

---

## Reset the database

If you want to start fresh and clear all data:
1. Go to Supabase → SQL Editor
2. Run: `truncate public.messages, public.chats, public.connections, public.businesses, public.profiles cascade;`
3. Reload the app

---

## Project file structure

```
bizzkit-real/
├── .env                    ← Your private keys (never share this)
├── .env.example            ← Template showing what keys are needed
├── index.html              ← App entry point
├── package.json            ← Dependencies
├── vite.config.ts          ← Build config
├── supabase/
│   └── schema.sql          ← Run this in Supabase SQL Editor once
└── src/
    ├── main.tsx            ← React entry point
    ├── App.tsx             ← Navigation and layout
    ├── styles/globals.css  ← All styling
    ├── lib/supabase.ts     ← Database client + types
    ├── context/AppContext.tsx  ← Global state
    └── pages/
        ├── AuthPage.tsx        ← Sign in / Sign up
        ├── FeedPage.tsx        ← Browse businesses
        ├── MessagesPage.tsx    ← Chat + video calls
        ├── ConferencePage.tsx  ← Book conferences
        └── OtherPages.tsx      ← Profile, Go Random, Trust
```
