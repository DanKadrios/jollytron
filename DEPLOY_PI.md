# Raspberry Pi Deployment Guide

This guide walks you through deploying JollyTron to a Raspberry Pi 400 for 24/7 hosting.

## Prerequisites

- Raspberry Pi 400 (or any Pi with Raspberry Pi OS)
- SSH enabled on the Pi
- Network connection
- Your Discord bot credentials ready

## 1. Prepare the Raspberry Pi

### Enable SSH and update (on the Pi)

```bash
# Enable SSH if not already enabled
sudo raspi-config nonint do_ssh 0

# Update system packages
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

### Find your Pi's IP address

After reboot, on the Pi:

```bash
hostname -I
```

Note the first IP address (e.g., `192.168.1.123`).

### Connect from your computer

From Windows:

```powershell
ssh pi@192.168.1.123
```

Default password is usually `raspberry` (change it with `passwd` after first login).

## 2. Install Runtime Dependencies

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg (required for audio playback)
sudo apt install -y ffmpeg

# Install Git
sudo apt install -y git

# Verify installations
node -v
npm -v
ffmpeg -version
```

## 3. Clone and Setup the Bot

```bash
# Clone the repository
cd ~
git clone https://github.com/DanKadrios/jollytron.git
cd jollytron

# Install Node.js dependencies
npm install
```

## 4. Configure Environment

### Create .env file

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here
AUTHORIZED_USER_IDS=user_id_1,user_id_2
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Transfer Media Files

From your Windows machine, copy your MP3 files to the Pi:

```powershell
# Copy all MP3s from your local media folder
scp C:\Users\danie\Downloads\JollyMF\media\*.mp3 pi@192.168.1.123:~/jollytron/media/
```

Or use FileZilla/WinSCP for a GUI transfer.

## 5. Register Slash Commands

```bash
cd ~/jollytron
npm run deploy:commands
```

This registers `/jolly` and `/grinch` commands with Discord.

## 6. Test Manual Run

```bash
npm run start
```

- Check that the bot logs in successfully
- Test `/jolly @user` in Discord
- Verify audio playback works
- Stop with `Ctrl+C`

## 7. Run as a Service (Auto-start on Boot)

### Option A: systemd (Recommended)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/jollytron.service
```

Paste this configuration:

```ini
[Unit]
Description=JollyTron Discord Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/jollytron
ExecStart=/usr/bin/node /home/pi/jollytron/src/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

Enable and start the service:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable jollytron

# Start the service now
sudo systemctl start jollytron

# Check status
sudo systemctl status jollytron
```

### Useful systemd commands:

```bash
# View live logs
journalctl -u jollytron -f

# Restart the bot
sudo systemctl restart jollytron

# Stop the bot
sudo systemctl stop jollytron

# Check status
sudo systemctl status jollytron
```

### Option B: PM2 (Alternative)

PM2 is easier for quick restarts and log management:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the bot with PM2
cd ~/jollytron
pm2 start npm --name jollytron -- run start

# Save PM2 process list
pm2 save

# Setup auto-start on boot
pm2 startup systemd -u pi --hp /home/pi
# Follow the command it outputs to finalize
```

### Useful PM2 commands:

```bash
# View logs
pm2 logs jollytron

# Restart
pm2 restart jollytron

# Stop
pm2 stop jollytron

# List all processes
pm2 list

# Monitor CPU/memory
pm2 monit
```

## 8. Updating the Bot

When you push updates to GitHub:

```bash
cd ~/jollytron
git pull origin main
npm install  # If dependencies changed
sudo systemctl restart jollytron  # Or: pm2 restart jollytron
```

## Troubleshooting

### Bot won't connect

- Check `.env` has correct `DISCORD_TOKEN`
- Verify the token hasn't been regenerated in Discord Developer Portal
- Check logs: `journalctl -u jollytron -n 50`

### No audio playback

- Verify FFmpeg is installed: `ffmpeg -version`
- Check media files exist: `ls ~/jollytron/media/`
- Ensure bot has Connect/Speak permissions in Discord

### Service won't start

```bash
# Check service status
sudo systemctl status jollytron

# View full logs
journalctl -u jollytron -n 100 --no-pager

# Test running manually
cd ~/jollytron
npm run start
```

### Memory issues on older Pis

If running on a Pi Zero or Pi 3, you may need to limit memory:

```bash
# Edit service file
sudo nano /etc/systemd/system/jollytron.service

# Add under [Service]:
Environment=NODE_OPTIONS=--max-old-space-size=256
```

## Security Notes

- **Change default password**: Run `passwd` on first login
- **Keep `.env` secure**: Never commit it to git (already in `.gitignore`)
- **Rotate bot token if leaked**: Regenerate in Discord Developer Portal
- **Update regularly**: Run `sudo apt update && sudo apt upgrade` monthly
- **Firewall**: The Pi doesn't need to expose any ports (bot connects outbound to Discord)

## Performance Tips

- The Pi 400 is plenty powerful for this bot
- Older Pis may benefit from disabling desktop: `sudo raspi-config` → Boot Options → Console
- Use `htop` to monitor resource usage

---

**Your bot is now running 24/7!** 🎄

Test by using `/jolly @user` in Discord while someone is in a voice channel.
