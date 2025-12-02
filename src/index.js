const { Client, Collection, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { FollowManager } = require('./followManager');

if (!config.token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

// Load commands (only jolly for now)
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith('.js')) continue;
  const cmd = require(path.join(commandsPath, file));
  if (cmd?.data && cmd?.execute) {
    client.commands.set(cmd.data.name, cmd);
  }
}

const followManager = new FollowManager(config.mediaDir, console);
const ctx = {
  authorizedUserIds: config.authorizedUserIds,
  followManager,
  following: new Set()
};

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  if (config.guildId) {
    // register commands to the single guild at startup for convenience in dev
    try {
      const rest = new REST({ version: '10' }).setToken(config.token);
      const cmds = client.commands.map(cmd => cmd.data.toJSON());
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: cmds });
      console.log('Registered guild commands.');
    } catch (e) {
      console.warn('Failed to register guild commands on startup:', e.message);
    }
  }
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  followManager.handleVoiceStateUpdate(oldState, newState);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, ctx);
  } catch (e) {
    console.error('Command error:', e);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: 'There was an error executing that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
  }
});

client.login(config.token);
