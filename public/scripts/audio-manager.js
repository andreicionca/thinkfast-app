class AudioManager {
  constructor() {
    // Web Audio API context
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Background music
    this.backgroundMusic = document.getElementById("background-music");

    // Buffers pentru sunete
    this.buffers = {};
    this.sources = {};

    // Volume din localStorage sau valori default
    this.loadGameConfig();

    // Încărcăm sunetele
    this.loadSounds({
      tick: "assets/app/sounds/tick.mp3",
      correct: "assets/app/sounds/correct_or_next.mp3",
      wrong: "assets/app/sounds/wrong.mp3",
      endGame: "assets/app/sounds/end-game.mp3",
    });
  }

  loadGameConfig() {
    const gameConfig = JSON.parse(localStorage.getItem("gameConfig")) || {
      settings: {
        backgroundVolume: 0.1,
        effectsVolume: 0.3,
        tickVolume: 0.2,
      },
    };

    this.volumes = gameConfig.settings;

    this.backgroundMusic.volume = this.volumes.backgroundVolume;
  }

  async loadSounds(sources) {
    for (let [name, url] of Object.entries(sources)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(
          arrayBuffer
        );
        this.buffers[name] = audioBuffer;
      } catch (error) {
        console.error(`Eroare la încărcarea sunetului ${name}:`, error);
      }
    }
  }

  playSound(soundName) {
    if (this.buffers[soundName]) {
      if (this.sources[soundName]) {
        this.sources[soundName].stop();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers[soundName];
      gainNode.gain.value = this.volumes.effectsVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.sources[soundName] = source;
      source.start(0);

      source.onended = () => {
        delete this.sources[soundName];
      };

      return source;
    }
  }

  startTick() {
    if (this.buffers.tick && !this.sources.tick) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers.tick;
      source.loop = true;
      gainNode.gain.value = this.volumes.tickVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.sources.tick = source;
      source.start(0);
    }
  }

  stopTick() {
    if (this.sources.tick) {
      this.sources.tick.stop();
      delete this.sources.tick;
    }
  }

  pauseTick() {
    this.stopTick();
  }

  resumeTick() {
    this.startTick();
  }

  playCorrect() {
    this.playSound("correct");
  }

  playWrong() {
    this.playSound("wrong");
  }

  playEndGame() {
    this.playSound("endGame");
  }

  startBackgroundMusic() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    this.backgroundMusic
      .play()
      .catch((e) => console.log("Eroare la pornirea muzicii:", e));
  }

  pauseBackgroundMusic() {
    this.backgroundMusic.pause();
  }

  stopBackgroundMusic() {
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  resumeBackgroundMusic() {
    if (this.backgroundMusic.paused) {
      this.startBackgroundMusic();
    }
  }
  setVolumes(volumes) {
    this.volumes = volumes;
    this.backgroundMusic.volume = this.volumes.backgroundVolume;
  }
}

window.audioManager = new AudioManager();
