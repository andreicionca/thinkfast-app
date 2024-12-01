// Selectori elemente DOM
const gameTypeInputs = document.querySelectorAll('input[name="gameType"]');
const categoriesGrid = document.getElementById("categoriesGrid");
const loadGameBtn = document.getElementById("loadGameBtn");
const playerTimeInput = document.getElementById("playerTime");
const penaltyTimeInput = document.getElementById("penaltyTime");
const pauseTimeInput = document.getElementById("pauseTime");
const player1NameInput = document.getElementById("player1Name");
const player2NameInput = document.getElementById("player2Name");

let gameData = {
  selectedType: localStorage.getItem("lastGameType") || "image-to-short-answer",
  selectedCategories: [],
  settings: {
    playerTime: 50,
    penaltyTime: 5,
    pauseTime: 2,
    player1Name: "",
    player2Name: "",
    backgroundVolume: 0.1,
    effectsVolume: 0.3,
    tickVolume: 0.2,
  },
};

// Helper pentru verificarea tipului de joc
const gameTypes = {
  isImageGame: (type) => type.startsWith("image-"),
  isTextGame: (type) => type.startsWith("text-"),
  isHintsGame: (type) => type.startsWith("hints-"),
  isAudioGame: (type) => type.startsWith("audio-"),
};

async function loadGameData() {
  try {
    const response = await fetch(`/api/questions/${gameData.selectedType}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.categories) {
      populateCategories(data.categories);
    } else {
      console.error("Invalid data format");
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

function populateCategories(categories) {
  categoriesGrid.innerHTML = "";
  Object.entries(categories).forEach(([key, category]) => {
    const categoryElement = createCategoryElement(key, category);
    categoriesGrid.appendChild(categoryElement);
  });
}

function createCategoryElement(key, category) {
  const div = document.createElement("div");
  div.className = "category-item";
  div.innerHTML = `
   <label class="category-checkbox">
     <input type="checkbox" value="${key}">
     <div class="category-content">
       <span class="category-name">${category.name}</span>
     </div>
   </label>
 `;
  return div;
}

function handleGameTypeChange(event) {
  gameData.selectedType = event.target.value;
  localStorage.setItem("lastGameType", event.target.value);
  gameData.selectedCategories = [];
  loadGameData();
}

function handleCategorySelection() {
  const checkboxes = categoriesGrid.querySelectorAll('input[type="checkbox"]');
  gameData.selectedCategories = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  updateLoadButton();
}

function updateGameSettings() {
  const backgroundVolumeInput = document.getElementById("backgroundVolume");
  const effectsVolumeInput = document.getElementById("effectsVolume");
  const tickVolumeInput = document.getElementById("tickVolume");
  gameData.settings = {
    playerTime: parseInt(playerTimeInput.value) || 50,
    penaltyTime: parseInt(penaltyTimeInput.value) || 5,
    pauseTime: parseInt(pauseTimeInput.value) || 2,
    player1Name: player1NameInput.value.trim(),
    player2Name: player2NameInput.value.trim(),
    backgroundVolume: parseFloat(backgroundVolumeInput.value) / 100,
    effectsVolume: parseFloat(effectsVolumeInput.value) / 100,
    tickVolume: parseFloat(tickVolumeInput.value) / 100,
  };
}

function updateLoadButton() {
  const hasSelectedCategories = gameData.selectedCategories.length > 0;
  loadGameBtn.disabled = !hasSelectedCategories;
  loadGameBtn.querySelector(".button-text").textContent = hasSelectedCategories
    ? "ÎNCARCĂ JOCUL"
    : "Selectează cel puțin o categorie";
}

function shuffleQuestions(questions) {
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

async function handleGameLoad() {
  const button = loadGameBtn;
  button.disabled = true;
  const progress = button.querySelector(".loading-progress");
  progress.style.display = "block";

  try {
    updateGameSettings();
    const selectedQuestions = await getSelectedQuestions();
    const shuffledQuestions = shuffleQuestions(selectedQuestions);

    const gameConfig = {
      ...gameData,
      questions: shuffledQuestions,
    };
    localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

    // Preîncărcăm resursele în funcție de tipul jocului
    await preloadResources(shuffledQuestions);

    // Deschidem fereastra pentru organizatori
    window.organizerWindow = window.open(
      `/organizer/${gameData.selectedType}-organizer.html`,
      "organizerWindow",
      "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no"
    );

    // Redirecționăm către pagina corespunzătoare tipului de joc
    window.location.href = `/${gameData.selectedType}-game.html`;
  } catch (error) {
    console.error("Error loading game:", error);
    button.disabled = false;
    progress.style.display = "none";
  }
}

async function getSelectedQuestions() {
  const response = await fetch(`/api/questions/${gameData.selectedType}`);
  const data = await response.json();

  let selectedQuestions = [];
  gameData.selectedCategories.forEach((category) => {
    if (data.categories[category]) {
      selectedQuestions = [
        ...selectedQuestions,
        ...data.categories[category].questions,
      ];
    }
  });

  return selectedQuestions;
}

async function preloadResources(questions) {
  let loadedCount = 0;
  const totalResources = questions.length;

  // Gestionăm diferit fiecare tip de joc
  if (gameTypes.isImageGame(gameData.selectedType)) {
    // Pentru jocuri cu imagini
    const loadPromises = questions.map((question) =>
      preloadImage(question.question.media).then(() => {
        loadedCount++;
        updateLoadingProgress(loadedCount, totalResources);
      })
    );
    return Promise.all(loadPromises);
  } else if (gameTypes.isAudioGame(gameData.selectedType)) {
    // Pentru jocuri audio
    const loadPromises = questions.map((question) =>
      preloadAudio(question.question.media).then(() => {
        loadedCount++;
        updateLoadingProgress(loadedCount, totalResources);
      })
    );
    return Promise.all(loadPromises);
  } else {
    // Pentru text și hints
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < totalResources; i++) {
      await delay(50);
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  }
}

function updateLoadingProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  loadGameBtn.querySelector(
    ".button-text"
  ).textContent = `Se încarcă... (${current}/${total})`;
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}

function preloadAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = resolve;
    audio.onerror = reject;
    audio.src = src;
  });
}

function setupEventListeners() {
  // Event listeners pentru tipul de joc și categorii
  gameTypeInputs.forEach((input) => {
    input.addEventListener("change", handleGameTypeChange);
  });

  categoriesGrid.addEventListener("change", handleCategorySelection);

  // Event listeners pentru setări
  playerTimeInput.addEventListener("input", updateGameSettings);
  penaltyTimeInput.addEventListener("input", updateGameSettings);
  pauseTimeInput.addEventListener("input", updateGameSettings);

  // Event listeners pentru volume
  const volumeInputs = document.querySelectorAll('input[type="range"]');
  volumeInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.nextElementSibling.textContent = `${e.target.value}%`;
      updateGameSettings();
    });
  });

  // Event listener pentru încărcarea jocului
  loadGameBtn.addEventListener("click", handleGameLoad);
}

// Inițializare la încărcarea paginii
document.addEventListener("DOMContentLoaded", () => {
  loadGameData();
  setupEventListeners();

  // Setăm radio button-ul corect în funcție de lastGameType
  const savedType = localStorage.getItem("lastGameType");
  if (savedType) {
    const radioButton = document.querySelector(`input[value="${savedType}"]`);
    if (radioButton && !radioButton.disabled) {
      radioButton.checked = true;
    }
  }
});
