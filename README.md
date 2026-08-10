# Aternos Player Bot

Joins your Bedrock server as a real player (visible skin, walks in, shows in the player list) using `bedrock-protocol`.

## Deploy on Railway (phone-only, no PC needed)

1. **Make sure your Aternos server is started** before the bot tries to connect — Aternos servers sleep when nobody's on. Get the address from the Aternos app/site: something like `xxxxx.aternos.me` and a port (usually `19132` unless Aternos shows a different one).

2. **Push this to GitHub** (easiest on phone):
   - Open the GitHub app or github.com in your browser
   - Create a new repo (e.g. `aternos-bot`)
   - Use "Add file → Upload files" and upload `index.js`, `package.json`, and this `README.md`

3. **Deploy on Railway**:
   - Go to railway.app in your browser, sign in (uses your $5 trial credit, no card)
   - New Project → Deploy from GitHub repo → pick `aternos-bot`
   - Railway auto-detects Node.js and runs `npm install` + `npm start`

4. **Set environment variables** in Railway (Project → Variables):
   - `SERVER_HOST` = your Aternos address (e.g. `xxxxx.aternos.me`)
   - `SERVER_PORT` = your Aternos port (usually `19132`)
   - `BOT_USERNAME` = whatever name you want the bot to show as in-game
   - `OFFLINE_MODE` = `true` (since your server is cracked, no Xbox Live login needed)

5. **Deploy**. Check the Railway logs — you should see `Bot has spawned and is now visible as a player in the world.` Then check in-game: the bot should appear in the player list and world.

## Notes
- Aternos servers idle-shutdown if empty. This bot alone being connected may or may not count as "activity" depending on Aternos's current rules — don't rely on it to keep the server awake indefinitely, and don't leave it running 24/7 just to farm uptime; that risks a ban on Aternos.
- The bot currently just stands where it spawns. If you want it to walk around, look around, or respond to chat, that's straightforward to add — just say the word.
- If Aternos ever requires Xbox Live login on this server, set `OFFLINE_MODE=false` and we'll need to add a device-code auth step (you'll get a one-time link + code to approve on your phone).
