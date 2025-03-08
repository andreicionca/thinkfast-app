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
    general: [],
  },
  selectedDifficulties: ["ușor", "mediu", "greu"], // by default toate sunt selectate
  filterLogic: "SAU", // sau 'AND'
  distributionType: "NORMALĂ", // sau 'ECHILIBRATĂ'

  settings: {
    playerTime: 60,
    penaltyTime: 4,
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
    general: new Set(),
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

      // Process general tags (unchanged as it was already array-based)
      if (Array.isArray(question.tags.general)) {
        question.tags.general.forEach((gen) => tags.general.add(gen));
      }
    }
  });

  return {
    domain: Array.from(tags.domain),
    period: Array.from(tags.period),
    region: Array.from(tags.region),
    general: Array.from(tags.general),
  };
}

function populateSearchSuggestions(uniqueTags) {
  // Populăm sugestiile pentru fiecare search bar
  const domainSearch = document.getElementById("domainSearch");
  const periodSearch = document.getElementById("periodSearch");
  const regionSearch = document.getElementById("regionSearch");
  const generalSearch = document.getElementById("generalSearch");

  // Setăm datele pentru autocomplete
  setupAutocomplete(domainSearch, "domainSuggestions", uniqueTags.domain);
  setupAutocomplete(periodSearch, "periodSuggestions", uniqueTags.period);
  setupAutocomplete(regionSearch, "regionSuggestions", uniqueTags.region);
  setupAutocomplete(generalSearch, "generalSuggestions", uniqueTags.general);
}

function setupAutocomplete(inputElement, suggestionsId, suggestions) {
  const suggestionsElement = document.getElementById(suggestionsId);
  const selectedTagsGrid = document.getElementById("selectedTags");
  let isOpen = false;
  let sortedSuggestions = suggestions
    .slice()
    .sort((a, b) => a.localeCompare(b, "ro"));

  // Funcție helper pentru crearea elementelor de sugestie
  const createSuggestionItems = (items) => {
    const fragment = document.createDocumentFragment();
    items.forEach((tag) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = tag; // Utilizăm textContent în loc de innerHTML
      div.setAttribute("role", "option");
      div.setAttribute("tabindex", "0");
      fragment.appendChild(div);
    });
    return fragment;
  };

  // Gestionare focus
  inputElement.addEventListener("focus", () => {
    if (!isOpen) {
      const initialSuggestions = sortedSuggestions.slice(0, 5);
      suggestionsElement.innerHTML = "";
      suggestionsElement.appendChild(createSuggestionItems(initialSuggestions));
      suggestionsElement.style.display = "block";
      inputElement.setAttribute("aria-expanded", "true");
      isOpen = true;
    }
  });

  // Gestionare click extern
  document.addEventListener("click", (e) => {
    if (
      isOpen &&
      !inputElement.contains(e.target) &&
      !suggestionsElement.contains(e.target)
    ) {
      suggestionsElement.style.display = "none";
      inputElement.setAttribute("aria-expanded", "false");
      isOpen = false;
    }
  });

  // Gestionare input cu debounce
  let timeoutId;
  inputElement.addEventListener("input", (e) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const value = e.target.value.trim().toLowerCase();

      const filtered = sortedSuggestions
        .filter((tag) => tag.toLowerCase().includes(value))
        .slice(0, 6); // Limităm la primele 6 rezultate

      suggestionsElement.innerHTML = "";
      if (value && filtered.length > 0) {
        suggestionsElement.appendChild(createSuggestionItems(filtered));
        suggestionsElement.style.display = "block";
        isOpen = true;
      } else {
        suggestionsElement.style.display = "none";
        isOpen = false;
      }
    }, 150);
  });

  // Gestionare selecție
  const handleSuggestionSelect = (element) => {
    const selectedTag = element.textContent;
    const tagType = suggestionsId.replace("Suggestions", "");

    addTag(selectedTag, tagType);
    inputElement.value = "";
    suggestionsElement.style.display = "none";
    inputElement.setAttribute("aria-expanded", "false");
    isOpen = false;
    updateAvailableQuestionsCount();
  };

  // Evenimente pentru click și tastatură
  suggestionsElement.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-item")) {
      handleSuggestionSelect(e.target);
    }
  });

  // Navigare cu tastatura
  inputElement.addEventListener("keydown", (e) => {
    if (!isOpen) return;

    const items = suggestionsElement.querySelectorAll(".suggestion-item");
    let currentIndex = Array.from(items).findIndex(
      (item) => item === document.activeElement
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        items[currentIndex]?.focus();
        break;
      case "Enter":
        if (document.activeElement.classList.contains("suggestion-item")) {
          handleSuggestionSelect(document.activeElement);
        }
        break;
    }
  });
}

function updateDistributionDescription(isBalanced) {
  const normalDesc = document.querySelector(".normal-description");
  const balancedDesc = document.querySelector(".balanced-description");
  const distributionLabel = document.querySelector(".distribution-label");

  distributionLabel.textContent = isBalanced ? "ECHILIBRATĂ" : "NORMALĂ";
  normalDesc.style.display = isBalanced ? "none" : "block";
  balancedDesc.style.display = isBalanced ? "block" : "none";
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

// async function getSelectedQuestions() {
//   // 1. Mai întâi obținem lista categoriilor
//   const categoriesResponse = await fetch(
//     `/api/categories/${gameData.selectedType}`
//   );
//   const categories = await categoriesResponse.json();

//   // 2. Obținem toate întrebările din categoriile disponibile
//   let allQuestions = [];
//   for (const category of categories) {
//     const response = await fetch(
//       `/api/questions/${gameData.selectedType}/${category}`
//     );
//     const data = await response.json();

//     // Adăugăm întrebările din această categorie
//     const categoryQuestions = data.questions.map((q) => ({
//       ...q,
//       category: category,
//       question: q.question,
//       answer: q.answer,
//       tags: q.tags,
//     }));
//     allQuestions = allQuestions.concat(categoryQuestions);
//   }
//   console.log("Initial questions:", allQuestions.length);

//   let filteredQuestions = allQuestions.filter((question) => {
//     if (!question.tags) {
//       console.warn(
//         'Întrebare fără tags, setăm difficulty implicit "ușor":',
//         question
//       );
//       question.tags = { difficulty: "ușor" };
//     } else if (!question.tags.difficulty) {
//       console.warn(
//         'Întrebare fără difficulty, setăm implicit "ușor":',
//         question
//       );
//       question.tags.difficulty = "ușor";
//     }

//     return gameData.selectedDifficulties.includes(question.tags.difficulty);
//   });
//   console.log("After difficulty filter:", filteredQuestions.length);

//   const hasSelectedTags = Object.values(gameData.selectedTags).some(
//     (tags) => tags.length > 0
//   );
//   const hasSelectedCategories = gameData.selectedCategories.length > 0;

//   if (!hasSelectedCategories && !hasSelectedTags) {
//     return [];
//   }

//   let finalQuestions = [];

//   if (gameData.filterLogic === "ȘI") {
//     finalQuestions = filteredQuestions.filter((question) => {
//       // Check category (if categories are selected)
//       if (
//         hasSelectedCategories &&
//         !gameData.selectedCategories.includes(question.category)
//       ) {
//         return false;
//       }

//       // For AND logic, question must have all selected tags from each type
//       if (hasSelectedTags) {
//         for (const [tagType, selectedValues] of Object.entries(
//           gameData.selectedTags
//         )) {
//           if (selectedValues.length === 0) continue;

//           const questionTags = question.tags[tagType];
//           if (!Array.isArray(questionTags)) {
//             return false;
//           }

//           const hasAllTags = selectedValues.every((tag) =>
//             questionTags.includes(tag)
//           );
//           if (!hasAllTags) {
//             return false;
//           }
//         }
//       }

//       return true;
//     });
//   } else {
//     // OR logic
//     const selectedQuestionTexts = new Set();
//     const addIfNotExists = (q) => {
//       const identifier =
//         q.question.text || q.question.media || JSON.stringify(q.question.hints);
//       if (!selectedQuestionTexts.has(identifier)) {
//         selectedQuestionTexts.add(identifier);
//         finalQuestions.push(q);
//       }
//     };

//     if (hasSelectedCategories) {
//       filteredQuestions
//         .filter((q) => gameData.selectedCategories.includes(q.category))
//         .forEach((q) => addIfNotExists(q));
//     }

//     if (hasSelectedTags) {
//       filteredQuestions.forEach((question) => {
//         for (const [tagType, selectedValues] of Object.entries(
//           gameData.selectedTags
//         )) {
//           if (selectedValues.length === 0) continue;

//           const questionTags = question.tags[tagType];
//           if (!Array.isArray(questionTags)) continue;

//           const hasMatch = selectedValues.some((tag) =>
//             questionTags.includes(tag)
//           );

//           if (hasMatch) {
//             addIfNotExists(question);
//             break;
//           }
//         }
//       });
//     }
//   }

//   // Adăugăm aici logica pentru distribuția echilibrată
//   if (
//     gameData.distributionType === "ECHILIBRATĂ" &&
//     gameData.selectedCategories.length > 1
//   ) {
//     // Grupăm întrebările pe categorii
//     const questionsByCategory = {};
//     gameData.selectedCategories.forEach((category) => {
//       questionsByCategory[category] = finalQuestions.filter(
//         (q) => q.category === category
//       );
//     });

//     // Găsim numărul minim de întrebări per categorie
//     const minQuestions = Math.min(
//       ...Object.values(questionsByCategory).map(
//         (categoryQuestions) => categoryQuestions.length
//       )
//     );

//     // Selectăm același număr de întrebări din fiecare categorie
//     const balancedQuestions = [];
//     Object.values(questionsByCategory).forEach((categoryQuestions) => {
//       // Amestecăm întrebările din categorie și selectăm primele minQuestions
//       const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
//       balancedQuestions.push(...shuffled.slice(0, minQuestions));
//     });

//     return balancedQuestions;
//   }

//   return finalQuestions;
// }

async function getSelectedQuestions() {
  const categoriesResponse = await fetch(
    `/api/categories/${gameData.selectedType}`
  );
  const categories = await categoriesResponse.json();

  let allQuestions = [];
  for (const category of categories) {
    const response = await fetch(
      `/api/questions/${gameData.selectedType}/${category}`
    );
    const data = await response.json();
    allQuestions = allQuestions.concat(
      data.questions.map((q) => ({
        ...q,
        category: category,
        question: q.question,
        answer: q.answer,
        tags: q.tags || { difficulty: "ușor" },
      }))
    );
  }

  const hasSelectedTags = Object.values(gameData.selectedTags).some(
    (tags) => tags.length > 0
  );
  const hasSelectedCategories = gameData.selectedCategories.length > 0;

  if (!hasSelectedCategories && !hasSelectedTags) {
    return allQuestions;
  }

  let filteredQuestions = allQuestions;

  if (hasSelectedCategories) {
    filteredQuestions = filteredQuestions.filter((q) =>
      gameData.selectedCategories.includes(q.category)
    );
  }

  if (hasSelectedTags) {
    filteredQuestions = filteredQuestions.filter((question) => {
      if (gameData.filterLogic === "ȘI") {
        return Object.entries(gameData.selectedTags).every(([type, tags]) => {
          if (tags.length === 0) return true;
          return tags.every((tag) => question.tags[type]?.includes(tag));
        });
      } else {
        return Object.entries(gameData.selectedTags).some(([type, tags]) => {
          if (tags.length === 0) return false;
          return tags.some((tag) => question.tags[type]?.includes(tag));
        });
      }
    });
  }

  if (
    gameData.distributionType === "ECHILIBRATĂ" &&
    gameData.selectedCategories.length > 1
  ) {
    const questionsByCategory = {};
    gameData.selectedCategories.forEach((category) => {
      questionsByCategory[category] = filteredQuestions.filter(
        (q) => q.category === category
      );
    });

    const minQuestions = Math.min(
      ...Object.values(questionsByCategory).map((questions) => questions.length)
    );

    const balancedQuestions = [];
    Object.values(questionsByCategory).forEach((questions) => {
      balancedQuestions.push(...questions.slice(0, minQuestions));
    });

    return balancedQuestions;
  }

  return filteredQuestions;
}

async function loadGameData() {
  try {
    // 1. Obținem lista categoriilor disponibile pentru tipul de joc selectat
    const categoriesResponse = await fetch(
      `/api/categories/${gameData.selectedType}`
    );
    if (!categoriesResponse.ok) {
      throw new Error(`HTTP error! status: ${categoriesResponse.status}`);
    }
    const categories = await categoriesResponse.json();

    // 2. Încărcăm datele pentru fiecare categorie
    const loadedCategories = {};
    for (const category of categories) {
      const categoryResponse = await fetch(
        `/api/questions/${gameData.selectedType}/${category}`
      );
      if (!categoryResponse.ok) {
        console.warn(`Could not load category ${category}`);
        continue;
      }
      const categoryData = await categoryResponse.json();
      loadedCategories[category] = categoryData;
    }

    // 3. Combinăm datele într-un format compatibil
    const data = {
      categories: loadedCategories,
    };

    // 4. Procesăm datele ca înainte
    if (data && data.categories) {
      const allQuestions = Object.values(data.categories).flatMap(
        (category) => category.questions
      );

      // Extragem tagurile unice
      const uniqueTags = extractUniqueTags(allQuestions);

      // Populăm sugestiile pentru search bars
      populateSearchSuggestions(uniqueTags);

      // Populăm categoriile
      populateCategories(data.categories);

      // Actualizăm numărul de întrebări disponibile
      updateAvailableQuestionsCount();
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
  gameData.selectedTags = { domain: [], period: [], region: [], general: [] };
  updateSelectedTagsDisplay(); // Actualizează afișajul tag-urilor

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
    // Add debug logs

    const shuffledQuestions = shuffleQuestions(selectedQuestions);
    // Verifică structura întrebărilor
    if (
      shuffledQuestions.some((q) => {
        if (gameTypes.isHintsGame(gameData.selectedType)) {
          return !q.question?.hints;
        } else {
          return !q.question || (!q.question.text && !q.question.media);
        }
      })
    ) {
      console.error("Întrebări invalide detectate:", shuffledQuestions);
    }

    const gameConfig = {
      ...gameData,
      questions: shuffledQuestions,
    };

    localStorage.setItem("gameConfig", JSON.stringify(gameConfig));

    // Preîncărcăm resursele în funcție de tipul jocului
    await preloadResources(shuffledQuestions);

    // Deschidem fereastra pentru organizatori
    if (!gameData.selectedType.includes("multiple-choice")) {
      window.organizerWindow = window.open(
        `/organizer/${gameData.selectedType}-organizer.html`,
        "organizerWindow",
        "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no"
      );
    }

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
    // Logica pentru imagini
    for (const question of questions) {
      if (!question.question?.media) {
        console.warn(`Întrebare invalidă: ${question.id}`);
        continue;
      }

      const isValid = await preloadImage(question.question.media);
      if (isValid) validQuestions.push(question);
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  } else if (gameTypes.isAudioGame(gameData.selectedType)) {
    // Logica pentru audio
    for (const question of questions) {
      if (!question.question?.media) {
        console.warn(`Întrebare invalidă: ${question.id}`);
        continue;
      }

      try {
        await preloadAudio(question.question.media);
        validQuestions.push(question);
      } catch (e) {
        console.warn(`Audio invalid: ${question.question.media}`);
      }
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  } else {
    // Logica pentru text, hints și alte tipuri
    validQuestions = questions.filter((q) => {
      if (gameTypes.isTextGame(gameData.selectedType)) {
        return !!q.question?.text; // Validează text
      }
      if (gameTypes.isHintsGame(gameData.selectedType)) {
        const isValid =
          Array.isArray(q.question?.hints) && q.question.hints.length > 0;
        if (!isValid) console.warn("Întrebare hints invalidă:", q);
        return isValid;
      }
      return true; // Tipuri necunoscute (nu filtra)
    });

    // Simulare încărcare
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let i = 0; i < questions.length; i++) {
      await delay(20);
      loadedCount++;
      updateLoadingProgress(loadedCount, totalResources);
    }
  }

  return validQuestions;
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

  // Inițializare switch pentru distribuție intrebări
  const distributionSwitch = document.getElementById("distributionSwitch");
  distributionSwitch.checked = gameData.distributionType === "ECHILIBRATĂ";
  updateDistributionDescription(distributionSwitch.checked);

  distributionSwitch.addEventListener("change", (e) => {
    gameData.distributionType = e.target.checked ? "ECHILIBRATĂ" : "NORMALĂ";
    updateDistributionDescription(e.target.checked);
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

// Funcție separată pentru actualizarea tuturor stărilor vizuale
function forceUpdateVisualStates() {
  // Actualizare switch-uri
  const logicSwitch = document.getElementById("filterLogicSwitch");
  const distributionSwitch = document.getElementById("distributionSwitch");
  updateLogicDescription(logicSwitch.checked);
  updateDistributionDescription(distributionSwitch.checked);

  // Actualizare dificultate
  const difficultyCheckboxes = document.querySelectorAll(
    '.difficulty-checkbox input[type="checkbox"]'
  );
  difficultyCheckboxes.forEach((checkbox) => {
    checkbox.checked = gameData.selectedDifficulties.includes(checkbox.value);
  });
  handleDifficultySelection();

  // Actualizare tip joc
  const savedType = localStorage.getItem("lastGameType");
  if (savedType) {
    const radioButton = document.querySelector(`input[value="${savedType}"]`);
    if (radioButton && !radioButton.disabled) {
      radioButton.checked = true;
      handleGameTypeChange({ target: radioButton });
    }
  }
}

// Inițializare la încărcarea paginii

// În loc de DOMContentLoaded, folosim pageshow
window.addEventListener("pageshow", (event) => {
  // verificăm dacă pagina vine din cache
  if (event.persisted) {
    // dacă da, forțăm reîncărcarea stărilor
    forceUpdateVisualStates();
  }

  // oricum executăm inițializarea normală
  loadGameData();
  setupEventListeners();
  setupTabs();
  forceUpdateVisualStates();
});
