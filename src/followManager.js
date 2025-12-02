const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { MusicPlayer } = require('./music');
const path = require('path');

class FollowSession {
  constructor(guild, targetUserId, mediaDir, logger = console) {
    this.guild = guild;
    this.targetUserId = targetUserId;
    this.logger = logger;
    this.mediaDir = mediaDir;
    this.music = new MusicPlayer(mediaDir, logger);
    this.music.loadPlaylist();
    this.connection = null;
  }

  ensureConnection() {
    const vs = this.guild.voiceStates.cache.get(this.targetUserId);
    const channelId = vs?.channelId;
    if (!channelId) {
      this.disconnect();
      return false;
    }

    if (this.connection && this.connection.joinConfig.channelId === channelId) {
      return true; // already in correct channel
    }

    const wasPlaying = this.music.isPlaying;

    // (Re)join
    this.disconnect();
    this.connection = joinVoiceChannel({
      channelId,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    // Set up reconnection handler for disconnects (kicked, network issues, etc.)
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Try to reconnect within 5 seconds
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Connection recovered
      } catch (error) {
        // Couldn't reconnect, check if target is still in voice and rejoin
        this.logger.warn('Voice connection lost, attempting to rejoin...');
        const currentVs = this.guild.voiceStates.cache.get(this.targetUserId);
        if (currentVs?.channelId) {
          // Target is still in voice, force rejoin
          this.disconnect();
          setTimeout(() => this.ensureConnection(), 1000);
        } else {
          // Target left, just disconnect
          this.disconnect();
        }
      }
    });

    this.music.attachTo(this.connection);
    // Resume from current position if we were already playing
    if (wasPlaying || this.music.currentIndex > 0) {
      this.music.resume();
    } else if (!this.music.isEmpty) {
      this.music.start();
    }
    return true;
  }

  disconnect() {
    try {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
    } catch {}
  }

  stop() {
    this.music.stop();
    this.disconnect();
  }
}

class FollowManager {
  constructor(mediaDir, logger = console) {
    this.mediaDir = mediaDir;
    this.logger = logger;
    this.sessions = new Map(); // key: guildId:userId
  }

  _key(guildId, userId) { return `${guildId}:${userId}`; }

  startFollow(guild, targetUserId) {
    const key = this._key(guild.id, targetUserId);
    if (this.sessions.has(key)) {
      return { already: true, session: this.sessions.get(key) };
    }
    const session = new FollowSession(guild, targetUserId, this.mediaDir, this.logger);
    this.sessions.set(key, session);
    // Attempt initial join if the target is in a channel now
    session.ensureConnection();
    return { already: false, session };
  }

  stopFollow(guild, targetUserId) {
    const key = this._key(guild.id, targetUserId);
    const session = this.sessions.get(key);
    if (!session) return { existed: false };
    session.stop();
    this.sessions.delete(key);
    return { existed: true };
  }

  handleVoiceStateUpdate(oldState, newState) {
    const userId = newState.id; // the member who changed state
    const guild = newState.guild;
    const key = this._key(guild.id, userId);
    const session = this.sessions.get(key);
    if (!session) return;
    // The followed user moved channels or connected/disconnected
    session.ensureConnection();
  }
}

module.exports = { FollowManager };
