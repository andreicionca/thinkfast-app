// Selectori elemente DOM
const hintsWrapper = document.getElementById("hints-wrapper");
const hintsContainer = document.getElementById("hints-container");
const answerDisplay = document.getElementById("answer-display");
const countdown = document.getElementById("countdown");
const player1Timer = document.getElementById("player1-timer");
const player2Timer = document.getElementById("player2-timer");
const player1Name = document.getElementById("player1-name");
const player2Name = document.getElementById("player2-name");
const startButton = document.getElementById("start-game");
const backgroundMusic = document.getElementById("background-music");
const playAgainButton = document.getElementById("play-again");
const resetGameButton = document.getElementById("reset-game");
const endGameButtons = document.querySelector(".end-game-buttons");

// Manager Audio
const audioManager = {
  backgroundMusic: backgroundMusic,
  tickSource: null,
  audioContext: new (window.AudioContext || window.webkitAudioContext)(),
  buffers: {},

  async init() {
    try {
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

  playSound(soundName) {
    if (this.buffers[soundName]) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = this.buffers[soundName];
      gainNode.gain.value = gameState.settings.effectsVolume;
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
      gainNode.gain.value = gameState.settings.tickVolume;
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
    this.playSound("correct");
  },

  playWrong() {
    this.playSound("wrong");
  },

  playEndGame() {
    this.playSound("endGame");
  },

  startBackgroundMusic() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    this.backgroundMusic.volume = gameState.settings.backgroundVolume;
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
  currentQuestionIndex: 0,
  currentPlayer: Math.random() < 0.5 ? 1 : 2,
  timeLeft1: 50,
  timeLeft2: 50,
  interval: null,
  isPaused: false,
  questions: [],
  settings: {},
};

// Flags pentru diverse stări
let penaltyActive = false;
let answerDisplaying = false;
let lastCorrectAnswerTime = 0;
let correctAnswerTimeout = null;
let gameEnded = false;
let organizerWindow = null;

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

    if (!organizerWindow || organizerWindow.closed) {
      organizerWindow = window.open(
        "/organizer/hints-to-short-answer-organizer.html",
        "organizerWindow",
        "width=1200,height=800"
      );
    }

    await audioManager.init();
    setupUI();
    setupEventListeners();
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
  playAgainButton.addEventListener("click", handlePlayAgain);
  resetGameButton.addEventListener("click", handleResetGame);
}

// Gestionare evenimente tastatură
function handleKeyPress(event) {
  if (gameEnded) return;

  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (penaltyActive || answerDisplaying || gameState.isPaused) return;

  const currentTime = Date.now();
  switch (event.key.toLowerCase()) {
    case "arrowright":
      if (
        currentTime - lastCorrectAnswerTime <
        gameState.settings.pauseTime * 1000
      )
        return;
      lastCorrectAnswerTime = currentTime;
      handleCorrectAnswer();
      break;
    case " ":
      handlePenalty();
      break;
  }
}

// Pornire joc
function startGame() {
  resetGameState();
  startButton.style.display = "none";
  localStorage.setItem("currentQuestionIndex", "0");
  localStorage.setItem("gameStarted", "true");
  localStorage.setItem("activePlayer", gameState.currentPlayer);
  startCountdown();
}

// Numărătoare inversă inițială
function startCountdown() {
  let count = 3;
  countdown.style.display = "flex";
  hintsContainer.style.opacity = "0";
  countdown.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(countInterval);
      countdown.style.display = "none";
      hintsContainer.style.opacity = "1";
      startRound();
    } else {
      countdown.textContent = count;
    }
  }, 1000);
}

// Pornire rundă
function startRound() {
  showCurrentHints();
  startTimer();
  audioManager.startBackgroundMusic();
  audioManager.startTick();
  updatePlayerStatus();
}

// Afișare indicii curente
function showCurrentHints() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  hintsContainer.innerHTML = "";

  currentQuestion.question.hints.forEach((hint) => {
    const hintCard = document.createElement("div");
    hintCard.className = "hint-card invisible";
    hintCard.textContent = hint;
    hintsContainer.appendChild(hintCard);

    // Ajustăm dimensiunea textului după ce cardul a fost adăugat în DOM
    setTimeout(() => {
      adjustHintTextSize(hintCard);
      hintCard.classList.remove("invisible"); // arătăm cardul după ajustare
    }, 0);
  });

  // Adăugăm un observer pentru a reajusta dimensiunea la redimensionarea ferestrei
  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      adjustHintTextSize(entry.target);
    });
  });

  // Observăm fiecare hint card
  document.querySelectorAll(".hint-card").forEach((card) => {
    resizeObserver.observe(card);
  });
}

// Timer
function startTimer() {
  clearInterval(gameState.interval);
  let updateCounter = 0;

  gameState.interval = setInterval(() => {
    if (!gameState.isPaused) {
      if (gameState.currentPlayer === 1) {
        if (gameState.timeLeft1 <= 0) {
          clearInterval(gameState.interval);
          endGame(2);
          return;
        }
        gameState.timeLeft1--;
        player1Timer.textContent = gameState.timeLeft1;
        if (updateCounter % 5 === 0) {
          localStorage.setItem("timeLeft1", gameState.timeLeft1.toString());
          localStorage.setItem("timeLeft2", gameState.timeLeft2.toString());
        }
      } else {
        if (gameState.timeLeft2 <= 0) {
          clearInterval(gameState.interval);
          endGame(1);
          return;
        }
        gameState.timeLeft2--;
        player2Timer.textContent = gameState.timeLeft2;
        if (updateCounter % 5 === 0) {
          localStorage.setItem("timeLeft1", gameState.timeLeft1.toString());
          localStorage.setItem("timeLeft2", gameState.timeLeft2.toString());
        }
      }
      updateCounter++;
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

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  answerDisplay.textContent = currentQuestion.answer.text;
  answerDisplay.className = "correct";

  correctAnswerTimeout = setTimeout(() => {
    answerDisplay.textContent = "";
    answerDisplay.className = "";
    answerDisplaying = false;
    nextQuestion();
    switchPlayer();
    startTimer();
    audioManager.startTick();
  }, gameState.settings.pauseTime * 1000);
}

// Gestionare penalizare
function handlePenalty() {
  if (penaltyActive) return;

  penaltyActive = true;
  audioManager.playWrong();

  const penaltyTime = gameState.settings.penaltyTime;
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

  answerDisplay.textContent = currentQuestion.answer.text;
  answerDisplay.className = "wrong";

  updatePlayerStatus();

  let remainingTime = penaltyTime;
  const penaltyInterval = setInterval(() => {
    if (!gameState.isPaused) {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(penaltyInterval);
        penaltyActive = false;
        answerDisplay.textContent = "";
        answerDisplay.className = "";
        updatePlayerStatus();
        if (
          (gameState.currentPlayer === 1 && gameState.timeLeft1 > 0) ||
          (gameState.currentPlayer === 2 && gameState.timeLeft2 > 0)
        ) {
          nextQuestion();
        }
      }
    }
  }, 1000);
}

// Trecere la următoarea întrebare
function nextQuestion() {
  gameState.currentQuestionIndex =
    (gameState.currentQuestionIndex + 1) % gameState.questions.length;
  showCurrentHints();
  localStorage.setItem("currentQuestionIndex", gameState.currentQuestionIndex);
  answerDisplay.textContent = "";
  answerDisplay.className = "";
}

// Schimbare jucător activ
function switchPlayer() {
  gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
  localStorage.setItem("activePlayer", gameState.currentPlayer);
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

function adjustHintTextSize(hintCard) {
  const containerHeight = hintCard.clientHeight;
  const containerWidth = hintCard.clientWidth;
  const text = hintCard.textContent;

  // Reset la dimensiunea inițială pentru măsurare
  hintCard.classList.remove(
    "text-xl",
    "text-lg",
    "text-md",
    "text-sm",
    "text-xs"
  );

  // Calculăm mai precis densitatea folosind și numărul de cuvinte
  const textLength = text.length;
  const wordCount = text.split(" ").length;
  const area = containerWidth * containerHeight;
  const density = (textLength * wordCount) / area;

  // Valori ajustate pentru densitate
  if (density < 0.01) {
    hintCard.classList.add("text-xl");
  } else if (density < 0.02) {
    hintCard.classList.add("text-lg");
  } else if (density < 0.03) {
    hintCard.classList.add("text-md");
  } else if (density < 0.04) {
    hintCard.classList.add("text-sm");
  } else {
    hintCard.classList.add("text-xs");
  }
}

// Pauză joc
function togglePause() {
  gameState.isPaused = !gameState.isPaused;

  if (gameState.isPaused) {
    if (correctAnswerTimeout) {
      clearTimeout(correctAnswerTimeout);
      correctAnswerTimeout = null;
    }
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
    if (answerDisplaying) {
      correctAnswerTimeout = setTimeout(() => {
        answerDisplay.textContent = "";
        answerDisplay.className = "";
        answerDisplaying = false;
        nextQuestion();
        switchPlayer();
        startTimer();
        audioManager.startTick();
      }, gameState.settings.pauseTime * 1000);
    }
  }
}

// Sfârșit joc
function endGame(winner) {
  gameEnded = true;
  localStorage.setItem(
    "gameEnded",
    JSON.stringify({
      winner: winner,
      reason: "time",
    })
  );
  clearInterval(gameState.interval);
  if (correctAnswerTimeout) {
    clearTimeout(correctAnswerTimeout);
    correctAnswerTimeout = null;
  }

  audioManager.stopBackgroundMusic();
  audioManager.playEndGame();

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  answerDisplay.textContent = currentQuestion.answer.text;

  player1Name.classList.remove("name-penalty");
  player2Name.classList.remove("name-penalty");
  player1Timer.classList.remove("timer-penalty");
  player2Timer.classList.remove("timer-penalty");

  if (winner === 1) {
    player1Name.classList.add("correct");
    player2Name.classList.add("wrong");
  } else {
    player2Name.classList.add("correct");
    player1Name.classList.add("wrong");
  }

  endGameButtons.style.display = "flex";
}
function handlePlayAgain() {
  resetGameState();
  shuffleQuestions();

  const gameConfig = {
    ...JSON.parse(localStorage.getItem("gameConfig")),
    questions: gameState.questions,
  };
  localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

  if (!organizerWindow || organizerWindow.closed) {
    organizerWindow = window.open(
      "/organizer/hints-to-short-answer-organizer.html",
      "organizerWindow",
      "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no"
    );
  }

  startGame();
}

function handleResetGame() {
  if (organizerWindow && !organizerWindow.closed) {
    organizerWindow.close();
  }
  cleanupOrganizerData();
  window.location.href = "/";
}

// Funcția pentru resetarea jocului la starea inițială
function resetGameState() {
  cleanupOrganizerData();
  localStorage.setItem("gameStarted", "false");
  localStorage.setItem("currentQuestionIndex", "0");
  localStorage.removeItem("activePlayer");
  localStorage.removeItem("gameEnded");
  localStorage.setItem("timeLeft1", gameState.settings.playerTime.toString());
  localStorage.setItem("timeLeft2", gameState.settings.playerTime.toString());

  gameEnded = false;
  gameState.timeLeft1 = gameState.settings.playerTime;
  gameState.timeLeft2 = gameState.settings.playerTime;
  gameState.currentQuestionIndex = 0;
  gameState.currentPlayer = Math.random() < 0.5 ? 1 : 2;

  // Resetăm display-ul
  player1Timer.textContent = gameState.timeLeft1;
  player2Timer.textContent = gameState.timeLeft2;
  answerDisplay.textContent = "";
  hintsContainer.style.opacity = "0";

  // Resetăm clasele
  player1Name.classList.remove(
    "correct",
    "wrong",
    "name-active",
    "name-penalty"
  );
  player2Name.classList.remove(
    "correct",
    "wrong",
    "name-active",
    "name-penalty"
  );
  player1Timer.classList.remove("timer-active", "timer-penalty");
  player2Timer.classList.remove("timer-active", "timer-penalty");

  // Ascundem butoanele de final
  endGameButtons.style.display = "none";
}

function shuffleQuestions() {
  for (let i = gameState.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.questions[i], gameState.questions[j]] = [
      gameState.questions[j],
      gameState.questions[i],
    ];
  }
}

function cleanupOrganizerData() {
  localStorage.removeItem("gameStarted");
  localStorage.removeItem("currentQuestionIndex");
  localStorage.removeItem("activePlayer");
  localStorage.removeItem("playerNames");
  localStorage.removeItem("timeLeft1");
  localStorage.removeItem("timeLeft2");
  localStorage.removeItem("gameEnded");
}

window.addEventListener("beforeunload", () => {
  if (organizerWindow && !organizerWindow.closed) {
    organizerWindow.close();
  }
  cleanupOrganizerData();
});

window.addEventListener("unload", () => {
  cleanupOrganizerData();
});

// Inițializare la încărcarea paginii
document.addEventListener("DOMContentLoaded", initGame);
