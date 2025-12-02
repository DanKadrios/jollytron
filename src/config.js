require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    return undefined;
  }
  return v.trim();
}

module.exports = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: required('GUILD_ID'),
  authorizedUserIds: (process.env.AUTHORIZED_USER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  mediaDir: require('path').join(__dirname, '..', 'media')
};
