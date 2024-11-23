class AudioManager {
  constructor() {
    // Web Audio API context
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Background music
    this.backgroundMusic = document.getElementById("background-music");
    this.backgroundMusic.volume = 0.2;

    // Buffers pentru sunete
    this.buffers = {};
    this.sources = {};

    // Încărcăm sunetele
    this.loadSounds({
      tick: "assets/app/sounds/tick.mp3",
      correct: "assets/app/sounds/correct_or_next.mp3",
      wrong: "assets/app/sounds/wrong.mp3",
      endGame: "assets/app/sounds/end-game.mp3",
    });
  }

  // Încărcarea sunetelor
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

  // Funcție pentru redarea sunetelor unice (non-loop)
  playSound(soundName, volume = 1) {
    if (this.buffers[soundName]) {
      // Oprim sursa anterioară dacă există
      if (this.sources[soundName]) {
        this.sources[soundName].stop();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers[soundName];
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.sources[soundName] = source;
      source.start(0);

      // Curățăm referința după ce sunetul s-a terminat
      source.onended = () => {
        delete this.sources[soundName];
      };

      return source;
    }
  }

  // Pornire tick loop
  startTick(volume = 0.2) {
    if (this.buffers.tick && !this.sources.tick) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers.tick;
      source.loop = true;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.sources.tick = source;
      source.start(0);
    }
  }

  // Oprire tick
  stopTick() {
    if (this.sources.tick) {
      this.sources.tick.stop();
      delete this.sources.tick;
    }
  }

  // Pauză tick
  pauseTick() {
    this.stopTick();
  }

  // Reluare tick
  resumeTick() {
    this.startTick();
  }

  // Răspuns corect
  playCorrect() {
    this.playSound("correct", 0.3);
  }

  // Penalizare
  playWrong() {
    this.playSound("wrong", 0.3);
  }

  // End game
  playEndGame() {
    this.playSound("endGame", 0.4);
  }

  // Background music controls
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
}

// Export pentru utilizare
window.audioManager = new AudioManager();
