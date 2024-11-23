// Selectori elemente DOM
const imageContainer = document.getElementById("image-container");
const currentImage = document.getElementById("current-image");
const answerOverlay = document.getElementById("answer-overlay");
const hintsContainer = document.getElementById("hints-container");
const countdown = document.getElementById("countdown");
const player1Timer = document.getElementById("player1-timer");
const player2Timer = document.getElementById("player2-timer");
const player1Name = document.getElementById("player1-name");
const player2Name = document.getElementById("player2-name");
const startButton = document.getElementById("start-game");
const player1IndiciiCounter = document.querySelector(".player1-hints-counter");
const player2IndiciiCounter = document.querySelector(".player2-hints-counter");
const backgroundMusic = document.getElementById("background-music");

// Manager Audio actualizat
const audioManager = {
  backgroundMusic: backgroundMusic,
  tickSource: null,
  audioContext: new (window.AudioContext || window.webkitAudioContext)(),
  buffers: {},

  async init() {
    try {
      // Încărcăm toate sunetele
      const sounds = {
        tick: "assets/app/sounds/tick.mp3",
        correct: "assets/app/sounds/correct_or_next.mp3",
        wrong: "assets/app/sounds/wrong.mp3",
        endGame: "assets/app/sounds/end-game.mp3",
      };

      for (let [name, url] of Object.entries(sounds)) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[name] = await this.audioContext.decodeAudioData(
          arrayBuffer
        );
      }
    } catch (error) {
      console.error("Eroare la încărcarea sunetelor:", error);
    }
  },

  playSound(soundName, volume = 0.3) {
    if (this.buffers[soundName]) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers[soundName];
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(0);
      return source;
    }
  },

  startTick() {
    if (this.buffers.tick && !this.tickSource) {
      this.tickSource = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      this.tickSource.buffer = this.buffers.tick;
      this.tickSource.loop = true;
      gainNode.gain.value = 0.2;

      this.tickSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.tickSource.start(0);
    }
  },

  stopTick() {
    if (this.tickSource) {
      this.tickSource.stop();
      this.tickSource = null;
    }
  },

  playCorrect() {
    this.playSound("correct", 0.3);
  },

  playWrong() {
    this.playSound("wrong", 0.3);
  },

  playEndGame() {
    this.playSound("endGame", 0.4);
  },

  startBackgroundMusic() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    this.backgroundMusic.volume = 0.3;
    this.backgroundMusic
      .play()
      .catch((e) => console.log("Eroare la pornirea muzicii:", e));
  },

  pauseBackgroundMusic() {
    this.backgroundMusic.pause();
    this.stopTick();
  },

  resumeBackgroundMusic() {
    if (this.backgroundMusic.paused) {
      this.startBackgroundMusic();
      this.startTick();
    }
  },

  stopBackgroundMusic() {
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
    this.stopTick();
  },
};

// Managementul stării jocului
let gameState = {
  currentImageIndex: 0,
  currentPlayer: Math.random() < 0.5 ? 1 : 2,
  timeLeft1: 50,
  timeLeft2: 50,
  interval: null,
  isPaused: false,
  questions: [],
  settings: {},
  indiciiFolosite: {
    player1: 0,
    player2: 0,
  },
  penaltyTimer: null,
  penaltyTimeLeft: 0,
};

// Flags pentru diverse stări
let penaltyActive = false;
let answerDisplaying = false;
let lastCorrectAnswerTime = 0;

// Funcție pentru actualizarea afișării numărului de indicii
function updateIndiciiDisplay() {
  player1IndiciiCounter.textContent = `Indicii: ${gameState.indiciiFolosite.player1}/2`;
  player2IndiciiCounter.textContent = `Indicii: ${gameState.indiciiFolosite.player2}/2`;
}

// Inițializare joc
async function initGame() {
  try {
    const gameConfig = JSON.parse(localStorage.getItem("gameConfig"));
    if (!gameConfig) {
      window.location.href = "/";
      return;
    }

    gameState.questions = gameConfig.questions;
    gameState.settings = gameConfig.settings;
    gameState.timeLeft1 = gameConfig.settings.playerTime;
    gameState.timeLeft2 = gameConfig.settings.playerTime;

    await audioManager.init();
    setupUI();
    setupEventListeners();
    updatePlayerStatus();
    updateIndiciiDisplay();
  } catch (error) {
    console.error("Eroare la inițializarea jocului:", error);
  }
}

// Configurare interfață utilizator
function setupUI() {
  player1Name.textContent = gameState.settings.player1Name || "Concurent 1";
  player2Name.textContent = gameState.settings.player2Name || "Concurent 2";
  player1Timer.textContent = gameState.timeLeft1;
  player2Timer.textContent = gameState.timeLeft2;
}

// Configurare evenimente
function setupEventListeners() {
  startButton.addEventListener("click", startGame);
  document.addEventListener("keydown", handleKeyPress);
}

// Gestionare evenimente tastatură
function handleKeyPress(event) {
  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (penaltyActive || answerDisplaying || gameState.isPaused) return;

  const currentTime = Date.now();
  switch (event.key.toLowerCase()) {
    case "arrowright":
      if (currentTime - lastCorrectAnswerTime < 1000) return;
      lastCorrectAnswerTime = currentTime;
      handleCorrectAnswer();
      break;
    case " ":
      handlePenalty();
      break;
    case "i":
      showIndiciu();
      break;
  }
}

// Pornire joc
function startGame() {
  startButton.style.display = "none";
  startCountdown();
}

// Numărătoare inversă inițială
function startCountdown() {
  let count = 3;
  countdown.style.display = "block";
  currentImage.style.display = "none";

  const countInterval = setInterval(() => {
    countdown.textContent = count;
    count--;

    if (count < 0) {
      clearInterval(countInterval);
      countdown.style.display = "none";
      currentImage.style.display = "block";
      startRound();
    }
  }, 1000);
}

// Pornire rundă
function startRound() {
  showCurrentImage();
  startTimer();
  audioManager.startBackgroundMusic();
  audioManager.startTick();
  updatePlayerStatus();
}

// Afișare imagine curentă
function showCurrentImage() {
  const currentQuestion = gameState.questions[gameState.currentImageIndex];
  currentImage.src = currentQuestion.question.media;
  currentImage.style.display = "block";
  resetIndicii();
}

// Pornire cronometru
function startTimer() {
  clearInterval(gameState.interval);

  gameState.interval = setInterval(() => {
    if (!gameState.isPaused) {
      if (gameState.currentPlayer === 1) {
        gameState.timeLeft1--;
        player1Timer.textContent = Math.max(gameState.timeLeft1, 0);
        if (gameState.timeLeft1 <= 0) endGame(2);
      } else {
        gameState.timeLeft2--;
        player2Timer.textContent = Math.max(gameState.timeLeft2, 0);
        if (gameState.timeLeft2 <= 0) endGame(1);
      }
    }
  }, 1000);
}

// Gestionare răspuns corect
function handleCorrectAnswer() {
  if (answerDisplaying) return;

  clearInterval(gameState.interval);
  audioManager.stopTick();
  audioManager.playCorrect();
  answerDisplaying = true;

  const currentQuestion = gameState.questions[gameState.currentImageIndex];
  answerOverlay.textContent = currentQuestion.answer.text;
  answerOverlay.className = "correct";
  answerOverlay.style.display = "block";

  setTimeout(() => {
    answerOverlay.style.display = "none";
    answerDisplaying = false;
    nextQuestion();
    switchPlayer();
    startTimer();
    audioManager.startTick();
  }, gameState.settings.pauseTime * 1000);
}

// Gestionare penalizare
// Gestionare penalizare
function handlePenalty() {
  if (penaltyActive) return;

  penaltyActive = true;
  audioManager.playWrong();

  const penaltyTime = gameState.settings.penaltyTime;
  const currentQuestion = gameState.questions[gameState.currentImageIndex];

  answerOverlay.textContent = currentQuestion.answer.text;
  answerOverlay.className = "wrong";
  answerOverlay.style.display = "block";

  updatePlayerStatus();

  let remainingTime = penaltyTime;
  const penaltyInterval = setInterval(() => {
    if (!gameState.isPaused) {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(penaltyInterval);
        penaltyActive = false;
        answerOverlay.style.display = "none";
        updatePlayerStatus();
        nextQuestion();
      }
    }
  }, 1000);
}

// Afișare indiciu
function showIndiciu() {
  const currentPlayer = gameState.currentPlayer === 1 ? "player1" : "player2";
  const currentQuestion = gameState.questions[gameState.currentImageIndex];

  // Verificăm dacă jucătorul a folosit deja cele 2 indicii permise
  if (gameState.indiciiFolosite[currentPlayer] >= 2) {
    return;
  }

  // Verificăm dacă mai sunt indicii disponibile pentru întrebarea curentă
  if (
    gameState.indiciiFolosite[currentPlayer] >=
    currentQuestion.question.hints.length
  ) {
    return;
  }

  const indiciu =
    currentQuestion.question.hints[gameState.indiciiFolosite[currentPlayer]];
  gameState.indiciiFolosite[currentPlayer]++;

  hintsContainer.textContent = indiciu;
  hintsContainer.style.display = "block";

  updateIndiciiDisplay();
}

// Resetare indicii
function resetIndicii() {
  hintsContainer.style.display = "none";
  hintsContainer.textContent = "";
  updateIndiciiDisplay();
}

// Trecere la următoarea întrebare
function nextQuestion() {
  gameState.currentImageIndex =
    (gameState.currentImageIndex + 1) % gameState.questions.length;
  showCurrentImage();
  answerOverlay.style.display = "none";
}

// Schimbare jucător activ
function switchPlayer() {
  gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
  updatePlayerStatus();
}

// Actualizare status jucători
function updatePlayerStatus() {
  player1Name.classList.remove("name-active", "name-penalty");
  player2Name.classList.remove("name-active", "name-penalty");
  player1Timer.classList.remove("timer-active", "timer-penalty");
  player2Timer.classList.remove("timer-active", "timer-penalty");

  if (gameState.currentPlayer === 1) {
    player1Name.classList.add(penaltyActive ? "name-penalty" : "name-active");
    player1Timer.classList.add(
      penaltyActive ? "timer-penalty" : "timer-active"
    );
  } else {
    player2Name.classList.add(penaltyActive ? "name-penalty" : "name-active");
    player2Timer.classList.add(
      penaltyActive ? "timer-penalty" : "timer-active"
    );
  }
}

// Pauză joc
function togglePause() {
  gameState.isPaused = !gameState.isPaused;

  if (gameState.isPaused) {
    audioManager.pauseBackgroundMusic();
    const pauseOverlay = document.createElement("div");
    pauseOverlay.id = "pause-overlay";
    pauseOverlay.className = "pause-overlay";
    pauseOverlay.innerHTML = `
      <div class="pause-content">
        <h2>JOC ÎN PAUZĂ</h2>
        <p>Apasă P pentru a continua</p>
      </div>
    `;
    document.body.appendChild(pauseOverlay);
  } else {
    audioManager.resumeBackgroundMusic();
    const pauseOverlay = document.getElementById("pause-overlay");
    if (pauseOverlay) {
      pauseOverlay.remove();
    }
  }
}

// Sfârșit joc
function endGame(winner) {
  clearInterval(gameState.interval);
  audioManager.stopBackgroundMusic();
  audioManager.playEndGame();

  const overlay = document.createElement("div");
  overlay.className = "winner-overlay";
  overlay.innerHTML = `
    <div class="winner-content">
      <h1>🏆 FELICITĂRI! 🏆</h1>
      <h2>${
        winner === 1
          ? gameState.settings.player1Name
          : gameState.settings.player2Name
      } a câștigat!</h2>
      <button onclick="location.reload()" class="restart-button">Joc Nou</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Inițializare la încărcarea paginii
document.addEventListener("DOMContentLoaded", initGame);
