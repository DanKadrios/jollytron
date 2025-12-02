# JollyTron

A Discord bot that follows a specified user around voice channels and plays Christmas music from your local `media` folder.

## What it does

- `/jolly @user` — Toggles following for the chosen user in this server.
  - If the user is in a voice channel, the bot joins and starts playing.
  - If they move channels, the bot moves with them.
  - If they leave voice, the bot disconnects and waits; when they rejoin any voice channel, the bot reconnects and resumes.
- Only authorized users can run the command.

- `/grinch @user` — Explicitly stop following the chosen user.

## Requirements

- Node.js 18+
- A Discord application and bot token with the following Privileged Intents enabled in the Developer Portal:
  - Server Members Intent (not strictly required here)
  - Presence Intent (not required)
  - Make sure the bot has Gateway Intents for Guilds and Guild Voice States (standard)
- Bot permissions in your server: Connect, Speak, and (optionally) Move Members in voice channels.

## Setup

1. Clone or open this folder.
2. Install dependencies:

```powershell
npm install
```

3. Create your `.env` from the example and fill values:

```powershell
Copy-Item .env.example .env
```

Fill in:
- `DISCORD_TOKEN` — Your bot token
- `CLIENT_ID` — Your application's client ID
- `GUILD_ID` — (Optional) A single guild ID for fast command registration during development
- `AUTHORIZED_USER_IDS` — Comma-separated Discord user IDs who can use `/jolly`

4. Add some Christmas tracks to the `media` folder (local files only — mp3/ogg/wav/flac/m4a). Ensure you have rights to use these files.

5. Register the slash commands (re-run after pulling updates or adding commands):

```powershell
npm run deploy:commands
```

6. Start the bot:

```powershell
npm run start
```

Invite your bot with the recommended permissions (bot scope and `applications.commands`). A typical invite URL looks like:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` and adjust permissions as needed.

## Notes

- This bot purposely plays from local files to avoid copyright concerns. Do not use it to stream content you don't have rights to.
- The `/jolly` command is a toggle per target user per guild. Run it again with the same user to stop following them.
- If you want to follow multiple users concurrently, just run `/jolly` for each of them.

## Deploying to Raspberry Pi

For 24/7 hosting on a Raspberry Pi, see **[DEPLOY_PI.md](./DEPLOY_PI.md)** for a complete step-by-step guide including:
- Installing Node.js and FFmpeg on the Pi
- Cloning from GitHub
- Setting up systemd or PM2 for auto-restart
- Transferring media files
- Security and update procedures

## Troubleshooting

- If commands don't show up immediately when registering globally (without `GUILD_ID`), allow up to 1 hour. Using `GUILD_ID` is instant.
- If the bot isn't joining voice: ensure the target user is actually in a voice channel and the bot has Connect/Speak permissions.
- If no sound: verify you added supported audio files into `media/` and that the server's voice channel region/codec isn't causing issues.
