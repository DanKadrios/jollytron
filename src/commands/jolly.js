const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

function isAuthorized(userId, authorizedUserIds) {
  if (!authorizedUserIds || authorizedUserIds.length === 0) return false;
  return authorizedUserIds.includes(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jolly')
    .setDescription('Follow a user into voice and play Christmas music (toggles on/off for that user).')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('The user to follow')
      .setRequired(true)
    ),
  async execute(interaction, ctx) {
    const targetUser = interaction.options.getUser('user', true);

    if (!isAuthorized(interaction.user.id, ctx.authorizedUserIds)) {
      return interaction.reply({ content: 'Not authorized to use this command.', ephemeral: true });
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    // Toggle behavior: if already following target, stop; else start
    const stateKey = `${guild.id}:${targetUser.id}`;
    if (ctx.following.has(stateKey)) {
      ctx.followManager.stopFollow(guild, targetUser.id);
      ctx.following.delete(stateKey);
      return interaction.reply({ content: `Stopped following ${targetUser.tag}.`, ephemeral: true });
    }

  const { session } = ctx.followManager.startFollow(guild, targetUser.id);
    ctx.following.add(stateKey);

  const vs = guild.voiceStates.cache.get(targetUser.id);
  const channel = vs?.channelId ? guild.channels.cache.get(vs.channelId) : null;
  const where = channel ? `voice channel #${channel.name}` : 'no voice channel yet (will join when they do)';

    return interaction.reply({ content: `Now following ${targetUser.tag}; current status: ${where}.`, ephemeral: true });
  }
};
