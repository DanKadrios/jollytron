const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');

(async () => {
  if (!config.clientId || !config.token) {
    console.error('CLIENT_ID and DISCORD_TOKEN must be set in .env');
    process.exit(1);
  }
  const rest = new REST({ version: '10' }).setToken(config.token);

  const commandsPath = path.join(__dirname, 'commands');
  const commands = [];
  for (const file of fs.readdirSync(commandsPath)) {
    if (!file.endsWith('.js')) continue;
    const cmd = require(path.join(commandsPath, file));
    if (cmd?.data) commands.push(cmd.data.toJSON());
  }

  try {
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log('Registered guild commands');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Registered global commands (may take up to 1 hour to appear)');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
