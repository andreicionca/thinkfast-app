// Selectori elemente DOM
const questionContainer = document.getElementById("question-container");
const currentText = document.getElementById("current-text");
// const answerDisplay = document.getElementById("answer-display");
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
const playAgainButton = document.getElementById("play-again");
const resetGameButton = document.getElementById("reset-game");
const endGameButtons = document.querySelector(".end-game-buttons");
const optionsContainer = document.getElementById("options-container");
const option1 = document.getElementById("option1");
const option2 = document.getElementById("option2");
const option3 = document.getElementById("option3");

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

  playSound(soundName) {
    if (this.buffers[soundName]) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = this.buffers[soundName];
      gainNode.gain.value = gameState.settings.effectsVolume; // folosește volumul din settings
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
      gainNode.gain.value = gameState.settings.tickVolume; // folosește volumul din settings
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
    // this.backgroundMusic.volume = 0.3;
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
  indiciiFolosite: {
    player1: 0,
    player2: 0,
  },
  penaltyTimer: null,
  penaltyTimeLeft: 0,
  correctOptionIndex: null, // Poziția răspunsului corect după amestecare
};

// Flags pentru diverse stări
let penaltyActive = false;
let answerDisplaying = false;
let lastCorrectAnswerTime = 0;
let correctAnswerTimeout = null;
let gameEnded = false;
let organizerWindow = null;

// Funcție pentru ajustarea automată a dimensiunii textului
function adjustTextSize() {
  const textElement = currentText;
  let fontSize = 60;

  textElement.style.fontSize = `${fontSize}px`;

  while (
    (textElement.scrollHeight > textElement.clientHeight ||
      textElement.scrollWidth > textElement.clientWidth) &&
    fontSize > 17
  ) {
    fontSize -= 14;
    textElement.style.fontSize = `${fontSize}px`;
  }
}

// Funcție pentru actualizarea afișării numărului de indicii
function updateIndiciiDisplay() {
  player1IndiciiCounter.textContent = `Indicii: ${gameState.indiciiFolosite.player1}/2`;
  player2IndiciiCounter.textContent = `Indicii: ${gameState.indiciiFolosite.player2}/2`;
}

// Funcția de amestecare a întrebărilor
function shuffleQuestions() {
  for (let i = gameState.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.questions[i], gameState.questions[j]] = [
      gameState.questions[j],
      gameState.questions[i],
    ];
  }
}
// Funcție de amestecare a raspunsurilor
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
    localStorage.setItem(
      "playerNames",
      JSON.stringify({
        player1Name: gameConfig.settings.player1Name || "Concurent 1",
        player2Name: gameConfig.settings.player2Name || "Concurent 2",
      })
    );

    // Inițializăm fereastra organizatorului dacă nu există
    if (!organizerWindow || organizerWindow.closed) {
      organizerWindow = window.open(
        "/organizer/text-to-multiple-choice-organizer.html",
        "organizerWindow",
        "width=1200,height=800, menubar=no,toolbar=no,location=no,status=no"
      );
    }

    await audioManager.init();
    setupUI();
    setupEventListeners();
    // updatePlayerStatus();
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

function handleKeyPress(event) {
  if (gameEnded) return;

  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (penaltyActive || answerDisplaying || gameState.isPaused) return;

  const currentTime = Date.now();
  let selectedOption;

  // Determinăm opțiunea selectată pe baza tastelor apăsate
  switch (event.key) {
    case "1":
    case "ArrowLeft":
      selectedOption = 1;
      break;
    case "2":
    case "ArrowUp":
      selectedOption = 2;
      break;
    case "3":
    case "ArrowRight":
      selectedOption = 3;
      break;
    case "i":
      showIndiciu();
      return;
    default:
      return;
  }

  // Verificăm dacă opțiunea selectată este corectă
  if (selectedOption === gameState.correctOptionIndex) {
    if (
      currentTime - lastCorrectAnswerTime <
      gameState.settings.pauseTime * 1000
    )
      return; // Evităm procesarea dublă a răspunsului corect
    lastCorrectAnswerTime = currentTime;
    handleCorrectAnswer(selectedOption); // Opțiunea selectată este corectă
  } else {
    handlePenalty(selectedOption, gameState.correctOptionIndex); // Penalizăm pentru răspuns greșit
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
  currentText.style.display = "none";
  countdown.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(countInterval);
      countdown.style.display = "none";
      currentText.style.display = "flex";
      startRound();
    } else {
      countdown.textContent = count;
    }
  }, 1000);
}

// Pornire rundă
function startRound() {
  optionsContainer.style.display = "flex";
  showCurrentQuestion();
  startTimer();
  audioManager.startBackgroundMusic();
  audioManager.startTick();
  updatePlayerStatus();
}

function showCurrentQuestion() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  currentText.textContent = currentQuestion.question.text;
  currentText.style.display = "flex";

  // Amestecăm răspunsurile
  const shuffledOptions = shuffleArray([...currentQuestion.answer.options]);

  // Populăm opțiunile amestecate
  shuffledOptions.forEach((option, index) => {
    document.getElementById(`option${index + 1}`).textContent = option;
  });

  // Salvăm indexul răspunsului corect
  gameState.correctOptionIndex =
    shuffledOptions.indexOf(currentQuestion.answer.correct) + 1;

  // Salvăm opțiunile amestecate în localStorage
  gameState.questions[gameState.currentQuestionIndex].answer.options =
    shuffledOptions;

  const gameConfig = {
    ...JSON.parse(localStorage.getItem("gameConfig")),
    questions: gameState.questions,
  };
  localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

  adjustTextSize();
  resetIndicii();
}

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
        // Actualizăm localStorage doar la fiecare 5 secunde
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
        // Actualizăm localStorage doar la fiecare 5 secunde
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
function handleCorrectAnswer(correctOption) {
  if (answerDisplaying) return;

  clearInterval(gameState.interval);
  audioManager.stopTick();
  audioManager.playCorrect();
  answerDisplaying = true;

  // Evidențiem opțiunea corectă
  document.getElementById(`option${correctOption}`).classList.add("correct");

  correctAnswerTimeout = setTimeout(() => {
    // Resetăm clasele
    document
      .getElementById(`option${correctOption}`)
      .classList.remove("correct");
    answerDisplaying = false;
    nextQuestion();
    switchPlayer();
    startTimer();
    audioManager.startTick();
  }, gameState.settings.pauseTime * 1000);
}

function handlePenalty(selectedOption) {
  if (penaltyActive) return;

  penaltyActive = true;
  audioManager.playWrong();

  // Evidențiem opțiunea greșită și cea corectă
  document.getElementById(`option${selectedOption}`).classList.add("wrong");
  document
    .getElementById(`option${gameState.correctOptionIndex}`)
    .classList.add("correct");

  updatePlayerStatus();

  const penaltyTime = gameState.settings.penaltyTime;
  let remainingTime = penaltyTime;

  const penaltyInterval = setInterval(() => {
    if (!gameState.isPaused) {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(penaltyInterval);
        penaltyActive = false;
        // Resetăm clasele
        document
          .getElementById(`option${selectedOption}`)
          .classList.remove("wrong");
        document
          .getElementById(`option${gameState.correctOptionIndex}`)
          .classList.remove("correct");
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

// Afișare indiciu
function showIndiciu() {
  const currentPlayer = gameState.currentPlayer === 1 ? "player1" : "player2";
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

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
  gameState.currentQuestionIndex =
    (gameState.currentQuestionIndex + 1) % gameState.questions.length;
  showCurrentQuestion();
  localStorage.setItem("currentQuestionIndex", gameState.currentQuestionIndex);

  // Curățăm clasele de pe toate opțiunile
  option1.classList.remove("correct", "wrong");
  option2.classList.remove("correct", "wrong");
  option3.classList.remove("correct", "wrong");
  questionContainer.className = "";
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
        option1.classList.remove("correct", "wrong");
        option2.classList.remove("correct", "wrong");
        option3.classList.remove("correct", "wrong");
        currentText.className = "";
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
// Modifică funcția endGame pentru a seta flag-ul
function endGame(winner) {
  gameEnded = true; // Setăm flag-ul
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

  document
    .getElementById(`option${gameState.correctOptionIndex}`)
    .classList.add("final-correct");

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
// Funcția pentru resetarea jocului la starea inițială
function resetGameState() {
  cleanupOrganizerData();
  localStorage.setItem("gameStarted", "false");
  localStorage.setItem("currentQuestionIndex", "0");
  localStorage.removeItem("activePlayer");
  localStorage.removeItem("gameEnded");
  localStorage.setItem("timeLeft1", gameState.settings.playerTime.toString());
  localStorage.setItem("timeLeft2", gameState.settings.playerTime.toString());
  gameEnded = false; // Resetăm flag-ul
  // Resetăm timerii
  gameState.timeLeft1 = gameState.settings.playerTime;
  gameState.timeLeft2 = gameState.settings.playerTime;
  gameState.currentQuestionIndex = 0;
  gameState.currentPlayer = Math.random() < 0.5 ? 1 : 2;
  gameState.indiciiFolosite = { player1: 0, player2: 0 };

  // Resetăm display-ul
  player1Timer.textContent = gameState.timeLeft1;
  player2Timer.textContent = gameState.timeLeft2;
  option1.classList.remove("correct", "wrong", "final-correct");
  option2.classList.remove("correct", "wrong", "final-correct");
  option3.classList.remove("correct", "wrong", "final-correct");
  hintsContainer.style.display = "none";
  optionsContainer.style.display = "none";

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

  updateIndiciiDisplay();
}

// Event listeners pentru butoane
playAgainButton.addEventListener("click", () => {
  // Resetăm starea jocului
  resetGameState();

  // Reamestecăm întrebările
  shuffleQuestions();
  // Salvăm noua ordine a întrebărilor în localStorage
  const gameConfig = {
    ...JSON.parse(localStorage.getItem("gameConfig")),
    questions: gameState.questions,
  };
  localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

  // Dacă fereastra organizatorului nu există, o deschidem
  if (!organizerWindow || organizerWindow.closed) {
    organizerWindow = window.open(
      "/organizer/text-to-multiple-choice-organizer.html",
      "organizerWindow",
      "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no"
    );
  }

  startGame();
});

resetGameButton.addEventListener("click", () => {
  if (organizerWindow && !organizerWindow.closed) {
    organizerWindow.close();
  }
  cleanupOrganizerData();
  window.location.href = "/";
});

function cleanupOrganizerData() {
  // Ștergem doar datele specifice organizatorului
  localStorage.removeItem("gameStarted");
  localStorage.removeItem("currentQuestionIndex");
  localStorage.removeItem("activePlayer");
  localStorage.removeItem("playerNames");
  localStorage.removeItem("timeLeft1");
  localStorage.removeItem("timeLeft2");
  localStorage.removeItem("gameEnded");
}

window.addEventListener("beforeunload", () => {
  // Închide fereastra organizatorului
  if (organizerWindow && !organizerWindow.closed) {
    organizerWindow.close();
  }
  // Curăță datele organizatorului
  cleanupOrganizerData();
});
window.addEventListener("unload", () => {
  cleanupOrganizerData();
});
// Inițializare la încărcarea paginii
document.addEventListener("DOMContentLoaded", initGame);
