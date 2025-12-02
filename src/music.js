const { createAudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MusicPlayer {
  constructor(mediaDir, logger = console) {
    this.mediaDir = mediaDir;
    this.logger = logger;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.startTime = null;
    this.seekOffset = 0; // seconds to skip when starting a track
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });

    this.player.on('error', (e) => {
      this.logger.error('Audio player error:', e.message);
      this.next();
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.next();
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      this.isPlaying = true;
      if (!this.startTime) {
        this.startTime = Date.now();
      }
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.isPlaying = false;
    });
  }

  getCurrentPosition() {
    if (!this.isPlaying || !this.startTime) return this.seekOffset;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return this.seekOffset + elapsed;
  }

  _shuffle(array) {
    // Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  loadPlaylist() {
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }
    const files = fs.readdirSync(this.mediaDir);
    const exts = new Set(['.mp3', '.ogg', '.wav', '.flac', '.m4a']);
    const tracks = files
      .filter(f => exts.has(path.extname(f).toLowerCase()))
      .map(f => path.join(this.mediaDir, f));

    // Shuffle the playlist
    this.playlist = this._shuffle(tracks);

    if (this.playlist.length === 0) {
      this.logger.warn('No media files found in media folder. Add some Christmas tracks!');
    } else {
      this.logger.info(`Loaded ${this.playlist.length} track(s) in random order.`);
    }
  }

  get isEmpty() { return this.playlist.length === 0; }

  attachTo(connection) {
    connection.subscribe(this.player);
  }

  start() {
    if (this.isEmpty) {
      this.logger.warn('Playlist is empty, not starting playback.');
      return;
    }
    // Only reset to beginning if not already started
    if (!this.isPlaying && this.currentIndex === 0) {
      this.currentIndex = 0;
    }
    this._playCurrent();
  }

  resume() {
    // Resume playback if paused
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
    } else if (this.player.state.status === AudioPlayerStatus.Idle) {
      // Replay current track from saved position
      this._playCurrent();
    }
  }

  stop() {
    try { 
      // Save current position before stopping
      if (this.isPlaying) {
        this.seekOffset = this.getCurrentPosition();
      }
      this.player.stop(true); 
      this.startTime = null;
    } catch {}
  }

  next() {
    if (this.isEmpty) return;
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.seekOffset = 0; // Reset offset for new track
    this.startTime = null;
    this._playCurrent();
  }

  _playCurrent() {
    const file = this.playlist[this.currentIndex];
    const offset = Math.floor(this.seekOffset);
    
    if (offset > 0) {
      this.logger.info(`Playing: ${path.basename(file)} (from ${offset}s)`);
    } else {
      this.logger.info(`Playing: ${path.basename(file)}`);
    }

    let resource;
    
    if (offset > 0) {
      // Use FFmpeg to seek to the offset position
      const ffmpeg = spawn('ffmpeg', [
        '-ss', offset.toString(),
        '-i', file,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
      });
    } else {
      // No seeking needed, play normally
      resource = createAudioResource(file, { 
        inputType: StreamType.Arbitrary
      });
    }

    this.startTime = Date.now();
    this.player.play(resource);
  }
}

module.exports = { MusicPlayer };
