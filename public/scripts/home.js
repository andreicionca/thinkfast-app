const gameTypeInputs = document.querySelectorAll('input[name="gameType"]');
const categoriesGrid = document.getElementById("categoriesGrid");
const loadGameBtn = document.getElementById("loadGameBtn");
const playerTimeInput = document.getElementById("playerTime");
const penaltyTimeInput = document.getElementById("penaltyTime");
const pauseTimeInput = document.getElementById("pauseTime");
const player1NameInput = document.getElementById("player1Name");
const player2NameInput = document.getElementById("player2Name");

let gameData = {
  selectedType: "image-to-text",
  selectedCategories: [],
  settings: {
    playerTime: 50,
    penaltyTime: 5,
    pauseTime: 2,
    player1Name: "",
    player2Name: "",
  },
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

function setupNumericInputValidation(input, min, max) {
  input.addEventListener("input", () => {
    const value = parseInt(input.value);
    if (value < min) input.value = min;
    if (value > max) input.value = max;
    updateGameSettings();
  });
}

function updateGameSettings() {
  gameData.settings = {
    playerTime: parseInt(playerTimeInput.value),
    penaltyTime: parseInt(penaltyTimeInput.value),
    pauseTime: parseInt(pauseTimeInput.value),
    player1Name: player1NameInput.value.trim(),
    player2Name: player2NameInput.value.trim(),
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
    // Update game settings
    updateGameSettings();

    // Get questions for selected categories
    const selectedQuestions = await getSelectedQuestions();

    // Shuffle questions
    const shuffledQuestions = shuffleQuestions(selectedQuestions);

    // Save game configuration to localStorage
    const gameConfig = {
      ...gameData,
      questions: shuffledQuestions,
    };
    localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

    // Preload resources
    await preloadResources(shuffledQuestions);

    // Redirect to game page
    window.location.href = "/image-to-text-game.html";
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

  const loadPromises = questions.map((question) =>
    preloadImage(question.question.media).then(() => {
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    })
  );

  return Promise.all(loadPromises);
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

function setupEventListeners() {
  gameTypeInputs.forEach((input) => {
    input.addEventListener("change", handleGameTypeChange);
  });

  setupNumericInputValidation(playerTimeInput, 10, 300);
  setupNumericInputValidation(penaltyTimeInput, 1, 30);
  setupNumericInputValidation(pauseTimeInput, 1, 10);

  categoriesGrid.addEventListener("change", handleCategorySelection);
  loadGameBtn.addEventListener("click", handleGameLoad);
}

document.addEventListener("DOMContentLoaded", () => {
  loadGameData();
  setupEventListeners();
});
