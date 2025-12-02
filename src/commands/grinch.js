const { SlashCommandBuilder } = require('discord.js');

function isAuthorized(userId, authorizedUserIds) {
  if (!authorizedUserIds || authorizedUserIds.length === 0) return false;
  return authorizedUserIds.includes(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grinch')
    .setDescription('Stop following a user so the bot won\'t join their voice channel anymore.')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('The user to unfollow')
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

    const stateKey = `${guild.id}:${targetUser.id}`;
    const { existed } = ctx.followManager.stopFollow(guild, targetUser.id);
    ctx.following.delete(stateKey);

    if (existed) {
      return interaction.reply({ content: `Stopped following ${targetUser.tag}.`, ephemeral: true });
    } else {
      return interaction.reply({ content: `${targetUser.tag} was not being followed.`, ephemeral: true });
    }
  }
};
