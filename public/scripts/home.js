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
  selectedTags: {
    domain: [],
    period: [],
    region: [],
    specific: [],
  },
  selectedDifficulties: ["ușor", "mediu", "greu"], // by default toate sunt selectate
  filterLogic: "SAU", // sau 'AND'

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

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-trigger");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and content
      document
        .querySelectorAll(".tab-trigger")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active");
      const contentId = tab.dataset.tab;
      document.getElementById(contentId).classList.add("active");
    });
  });
}

// Adaugă funcția de handler pentru dificultate
function handleDifficultySelection() {
  const difficultyCheckboxes = document.querySelectorAll(
    '.difficulty-checkbox input[type="checkbox"]'
  );
  gameData.selectedDifficulties = Array.from(difficultyCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
  updateAvailableQuestionsCount();
}

// Funcție pentru extragerea tagurilor unice din toate întrebările
function extractUniqueTags(questions) {
  const tags = {
    domain: new Set(),
    period: new Set(),
    region: new Set(),
    specific: new Set(),
  };

  questions.forEach((question) => {
    if (question.tags) {
      // Process domain tags
      if (Array.isArray(question.tags.domain)) {
        question.tags.domain.forEach((domain) => tags.domain.add(domain));
      }

      // Process period tags
      if (Array.isArray(question.tags.period)) {
        question.tags.period.forEach((period) => tags.period.add(period));
      }

      // Process region tags
      if (Array.isArray(question.tags.region)) {
        question.tags.region.forEach((region) => tags.region.add(region));
      }

      // Process specific tags (unchanged as it was already array-based)
      if (Array.isArray(question.tags.specific)) {
        question.tags.specific.forEach((spec) => tags.specific.add(spec));
      }
    }
  });

  return {
    domain: Array.from(tags.domain),
    period: Array.from(tags.period),
    region: Array.from(tags.region),
    specific: Array.from(tags.specific),
  };
}

function populateSearchSuggestions(uniqueTags) {
  // Populăm sugestiile pentru fiecare search bar
  const domainSearch = document.getElementById("domainSearch");
  const periodSearch = document.getElementById("periodSearch");
  const regionSearch = document.getElementById("regionSearch");
  const specificSearch = document.getElementById("specificSearch");

  // Setăm datele pentru autocomplete
  setupAutocomplete(domainSearch, "domainSuggestions", uniqueTags.domain);
  setupAutocomplete(periodSearch, "periodSuggestions", uniqueTags.period);
  setupAutocomplete(regionSearch, "regionSuggestions", uniqueTags.region);
  setupAutocomplete(specificSearch, "specificSuggestions", uniqueTags.specific);
}

function setupAutocomplete(inputElement, suggestionsId, suggestions) {
  const suggestionsElement = document.getElementById(suggestionsId);
  const selectedTagsGrid = document.getElementById("selectedTags");

  inputElement.addEventListener("input", () => {
    const value = inputElement.value.toLowerCase();
    const filteredSuggestions = suggestions.filter((tag) =>
      tag.toLowerCase().includes(value)
    );

    if (value && filteredSuggestions.length > 0) {
      suggestionsElement.innerHTML = filteredSuggestions
        .map((tag) => `<div class="suggestion-item">${tag}</div>`)
        .join("");
      suggestionsElement.style.display = "block";
    } else {
      suggestionsElement.style.display = "none";
    }
  });

  // Adăugăm event listener pentru click pe sugestii
  suggestionsElement.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-item")) {
      const selectedTag = e.target.textContent;
      const tagType = suggestionsId.replace("Suggestions", ""); // Extrage tipul de tag

      // Adaugă tag-ul în grid și în gameData
      addTag(selectedTag, tagType);

      // Curăță input-ul și ascunde sugestiile
      inputElement.value = "";
      suggestionsElement.style.display = "none";

      // Actualizează numărul de întrebări disponibile
      updateAvailableQuestionsCount();
    }
  });
}

// Funcție pentru adăugarea unui tag
function addTag(tag, type) {
  if (gameData.selectedTags[type].includes(tag)) return;

  gameData.selectedTags[type].push(tag.trim());
  updateSelectedTagsDisplay();
  updateAvailableQuestionsCount();
}

function removeTag(tag, type) {
  gameData.selectedTags[type] = gameData.selectedTags[type].filter(
    (t) => t !== tag
  );
  updateSelectedTagsDisplay();
  updateAvailableQuestionsCount();
}
function updateLogicDescription(isAnd) {
  const orDescription = document.querySelector(".or-description");
  const andDescription = document.querySelector(".and-description");
  const logicLabel = document.querySelector(".logic-label");

  if (isAnd) {
    orDescription.style.display = "none";
    andDescription.style.display = "block";
    logicLabel.textContent = "ȘI";
  } else {
    orDescription.style.display = "block";
    andDescription.style.display = "none";
    logicLabel.textContent = "SAU";
  }
}
// Funcție pentru actualizarea numărului de întrebări disponibile
async function updateAvailableQuestionsCount() {
  const questions = await getSelectedQuestions();
  const count = questions.length;
  document.getElementById(
    "questionCount"
  ).textContent = `${count} întrebări disponibile`;

  const hasSelectedTags = Object.values(gameData.selectedTags).some(
    (tags) => tags.length > 0
  );
  const hasSelectedCategories = gameData.selectedCategories.length > 0;

  // Actualizează starea butonului
  loadGameBtn.disabled = !hasSelectedTags && !hasSelectedCategories;

  // Actualizează textul butonului
  const buttonText = loadGameBtn.querySelector(".button-text");
  if (hasSelectedTags || hasSelectedCategories) {
    buttonText.textContent = `ÎNCARCĂ JOCUL (${count} întrebări)`;
  } else {
    buttonText.textContent = "Selectează cel puțin un filtru sau o categorie";
  }
}

async function getSelectedQuestions() {
  const response = await fetch(`/api/questions/${gameData.selectedType}`);
  const data = await response.json();

  const allQuestions = Object.entries(data.categories).flatMap(
    ([categoryName, category]) =>
      category.questions.map((q) => ({
        ...q,
        category: categoryName,
        question: q.question,
        answer: q.answer,
        tags: q.tags,
      }))
  );

  // Filter by difficulty (always AND)
  let filteredQuestions = allQuestions.filter((question) =>
    gameData.selectedDifficulties.includes(question.tags.difficulty)
  );

  const hasSelectedTags = Object.values(gameData.selectedTags).some(
    (tags) => tags.length > 0
  );
  const hasSelectedCategories = gameData.selectedCategories.length > 0;

  if (!hasSelectedCategories && !hasSelectedTags) {
    return [];
  }

  let finalQuestions = [];

  if (gameData.filterLogic === "ȘI") {
    finalQuestions = filteredQuestions.filter((question) => {
      // Check category (if categories are selected)
      if (
        hasSelectedCategories &&
        !gameData.selectedCategories.includes(question.category)
      ) {
        return false;
      }

      // For AND logic, question must have all selected tags from each type
      if (hasSelectedTags) {
        for (const [tagType, selectedValues] of Object.entries(
          gameData.selectedTags
        )) {
          if (selectedValues.length === 0) continue;

          const questionTags = question.tags[tagType];
          if (!Array.isArray(questionTags)) {
            return false;
          }

          // For all tag types, check if all selected values are present
          const hasAllTags = selectedValues.every((tag) =>
            questionTags.includes(tag)
          );
          if (!hasAllTags) {
            return false;
          }
        }
      }

      return true;
    });
  } else {
    // OR logic
    const selectedQuestionIds = new Set();

    const addIfNotExists = (q) => {
      if (!selectedQuestionIds.has(q.id)) {
        selectedQuestionIds.add(q.id);
        finalQuestions.push(q);
      }
    };

    // Add questions matching selected categories
    if (hasSelectedCategories) {
      filteredQuestions
        .filter((q) => gameData.selectedCategories.includes(q.category))
        .forEach((q) => addIfNotExists(q));
    }

    // Add questions matching tags
    if (hasSelectedTags) {
      filteredQuestions.forEach((question) => {
        for (const [tagType, selectedValues] of Object.entries(
          gameData.selectedTags
        )) {
          if (selectedValues.length === 0) continue;

          const questionTags = question.tags[tagType];
          if (!Array.isArray(questionTags)) continue;

          // For OR logic, check if any selected tag matches
          const hasMatch = selectedValues.some((tag) =>
            questionTags.includes(tag)
          );

          if (hasMatch) {
            addIfNotExists(question);
            break;
          }
        }
      });
    }
  }

  return finalQuestions;
}

async function loadGameData() {
  try {
    const response = await fetch(`/api/questions/${gameData.selectedType}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.categories) {
      // Extragem toate întrebările într-un array
      const allQuestions = Object.values(data.categories).flatMap(
        (category) => category.questions
      );

      // Extragem tagurile unice
      const uniqueTags = extractUniqueTags(allQuestions);

      // Populăm sugestiile pentru search bars
      populateSearchSuggestions(uniqueTags);

      // Populăm categoriile ca și până acum
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

  updateAvailableQuestionsCount();
}
function updateSelectedTagsDisplay() {
  const selectedTagsGrid = document.getElementById("selectedTags");
  selectedTagsGrid.innerHTML = ""; // Curăță conținutul existent

  // Reconstruiește toate tag-urile
  Object.entries(gameData.selectedTags).forEach(([type, tags]) => {
    tags.forEach((tag) => {
      const tagElement = document.createElement("div");
      tagElement.className = "tag-chip";
      tagElement.innerHTML = `
        ${tag}
        <span class="remove-tag" onclick="removeTag('${tag}', '${type}')">&times;</span>
      `;
      selectedTagsGrid.appendChild(tagElement);
    });
  });
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
    // Verifică structura întrebărilor
    if (shuffledQuestions.some((q) => !q.question || !q.question.media)) {
      console.error(
        "Întrebări invalide detectate:",
        shuffledQuestions.filter((q) => !q.question || !q.question.media)
      );
    }
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

async function preloadResources(questions) {
  let validQuestions = [];
  let loadedCount = 0;
  const totalResources = questions.length;

  if (gameTypes.isImageGame(gameData.selectedType)) {
    // Pentru jocuri cu imagini
    for (const question of questions) {
      // Verificăm dacă cheia `question.media` există
      if (!question.question || !question.question.media) {
        console.warn(
          `Întrebare invalidă sau incompletă pentru ID-ul ${question.id}`
        );
        continue; // Sarim peste întrebarea invalidă
      }

      const isValid = await preloadImage(question.question.media);
      if (isValid) {
        validQuestions.push(question);
      } else {
        console.warn(
          `Imagine lipsă sau coruptă pentru întrebarea cu ID-ul ${question.id}`
        );
      }
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  } else if (gameTypes.isAudioGame(gameData.selectedType)) {
    // Pentru jocuri audio
    for (const question of questions) {
      // Verificăm dacă cheia `question.media` există
      if (!question.question || !question.question.media) {
        console.warn(
          `Întrebare invalidă sau incompletă pentru ID-ul ${question.id}`
        );
        continue; // Sarim peste întrebarea invalidă
      }

      const isValid = await preloadAudio(question.question.media);
      if (isValid) {
        validQuestions.push(question);
      } else {
        console.warn(
          `Fișier audio lipsă sau corupt pentru întrebarea cu ID-ul ${question.id}`
        );
      }
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  } else {
    // Pentru text și hints (nu există resurse de preîncărcat)
    validQuestions = questions;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let i = 0; i < totalResources; i++) {
      await delay(50);
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  }

  return validQuestions; // Returnăm doar întrebările valide
}

function updateLoadingProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  loadGameBtn.querySelector(
    ".button-text"
  ).textContent = `Se încarcă... (${current}/${total})`;
}

async function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true); // Imagine validă
    img.onerror = () => {
      console.error(`Imagine lipsă sau coruptă: ${src}`);
      resolve(false); // Imagine invalidă
    };
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
  // Adaugă event listener pentru închiderea dropdown-urilor când se face click în afara lor
  document.addEventListener("click", (e) => {
    if (
      !e.target.classList.contains("tag-search") &&
      !e.target.classList.contains("suggestion-item")
    ) {
      document.querySelectorAll(".search-suggestions").forEach((el) => {
        el.style.display = "none";
      });
    }
  });

  // Inițializare switch
  const logicSwitch = document.getElementById("filterLogicSwitch");
  logicSwitch.checked = gameData.filterLogic === "ȘI";
  updateLogicDescription(logicSwitch.checked);

  // Event listener pentru schimbări
  logicSwitch.addEventListener("change", (e) => {
    gameData.filterLogic = e.target.checked ? "ȘI" : "SAU";
    updateLogicDescription(e.target.checked);
    updateAvailableQuestionsCount();
  });
  // Event listeners pentru dificultate
  document
    .querySelectorAll('.difficulty-checkbox input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", handleDifficultySelection);
    });
  // Event listener pentru încărcarea jocului
  loadGameBtn.addEventListener("click", handleGameLoad);
}

// Inițializare la încărcarea paginii
document.addEventListener("DOMContentLoaded", () => {
  loadGameData();
  setupEventListeners();
  setupTabs();

  // Setăm radio button-ul corect în funcție de lastGameType
  const savedType = localStorage.getItem("lastGameType");
  if (savedType) {
    const radioButton = document.querySelector(`input[value="${savedType}"]`);
    if (radioButton && !radioButton.disabled) {
      radioButton.checked = true;
    }
  }
});
