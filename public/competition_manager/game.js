// Gestiunea stării aplicației
const state = {
  classes: {}, // structura JSON cu clase și elevi
  selectedClasses: [], // clasele selectate curent
  selectedPlayers: [], // jucătorii selectați individual
  teams: [], // echipele formate
  teamConfig: {
    // configurația pentru echipe
    numberOfTeams: 0,
    playersPerTeam: 0,
  },
};

// Funcții pentru localStorage
const storage = {
  save() {
    // Salvăm datele permanente (clase)
    localStorage.setItem(
      "classData",
      JSON.stringify({
        classes: state.classes,
      })
    );

    // Salvăm datele temporare (echipe și bracket) în alt key
    localStorage.setItem(
      "tempTournamentData",
      JSON.stringify({
        teams: state.teams,
        bracketData: state.bracketData,
        currentPhase: state.currentPhase,
      })
    );
  },

  load() {
    // Încărcăm datele permanente
    const classData = localStorage.getItem("classData");
    if (classData) {
      const parsed = JSON.parse(classData);
      state.classes = parsed.classes || {};
    }

    // Încărcăm datele temporare
    const tempData = localStorage.getItem("tempTournamentData");
    if (tempData) {
      const parsed = JSON.parse(tempData);
      state.teams = parsed.teams || [];
      state.bracketData = parsed.bracketData || null;
      state.currentPhase = parsed.currentPhase || "selection";
    }

    return true;
  },
  // Funcție nouă pentru ștergerea datelor temporare
  clearTempData() {
    localStorage.removeItem("tempTournamentData");
    state.teams = [];
    state.bracketData = null;
    state.currentPhase = "selection";
  },
};

// Gestiunea claselor și participanților
const classManager = {
  updateClasses(newClasses) {
    state.classes = { ...state.classes, ...newClasses };
    this.refreshClassesList();
    storage.save();
  },

  refreshClassesList() {
    const classesList = document.getElementById("classesList");
    classesList.innerHTML = "";

    Object.keys(state.classes).forEach((className) => {
      const classItem = document.createElement("div");
      classItem.className = `class-item ${
        state.selectedClasses.includes(className) ? "selected" : ""
      }`;
      classItem.textContent = className;
      classItem.onclick = () => this.toggleClass(className);
      classesList.appendChild(classItem);
    });
  },

  toggleClass(className) {
    const index = state.selectedClasses.indexOf(className);
    if (index === -1) {
      state.selectedClasses.push(className);
    } else {
      state.selectedClasses.splice(index, 1);
    }
    this.refreshClassesList();
    playerManager.refreshPlayersList();
  },
};

// Gestiunea participanților
const playerManager = {
  addPlayer(name) {
    name = name.trim();
    if (!name) return false;

    const existsInAnyClass = Object.values(state.classes).some((students) =>
      students.includes(name)
    );

    if (existsInAnyClass) return false;

    if (!state.classes["Necategorizați"]) {
      state.classes["Necategorizați"] = [];
    }
    state.classes["Necategorizați"].push(name);

    classManager.refreshClassesList();
    this.refreshPlayersList();
    storage.save();
    return true;
  },

  addMultiplePlayers(text) {
    const names = text
      .split(/[,\n]/)
      .map((name) => name.trim())
      .filter((name) => name);

    const addedCount = names.filter((name) => this.addPlayer(name)).length;
    return addedCount;
  },

  getPlayersFromSelectedClasses() {
    if (state.selectedClasses.length === 0) return [];
    return state.selectedClasses.flatMap(
      (className) => state.classes[className] || []
    );
  },

  refreshPlayersList() {
    const playersList = document.getElementById("playersList");
    playersList.innerHTML = "";

    const players = this.getPlayersFromSelectedClasses();

    players.forEach((name) => {
      const playerItem = document.createElement("div");
      playerItem.className = `player-item ${
        state.selectedPlayers.includes(name) ? "selected" : ""
      }`;
      playerItem.textContent = name;
      playerItem.onclick = () => this.togglePlayerSelection(name);
      playersList.appendChild(playerItem);
    });

    this.updateSelectionCounter();
    this.validateSelection();
  },

  togglePlayerSelection(name) {
    const index = state.selectedPlayers.indexOf(name);
    if (index === -1) {
      state.selectedPlayers.push(name);
    } else {
      state.selectedPlayers.splice(index, 1);
    }
    this.refreshPlayersList();
  },

  selectAll() {
    const players = this.getPlayersFromSelectedClasses();
    state.selectedPlayers = [
      ...new Set([...state.selectedPlayers, ...players]),
    ];
    this.refreshPlayersList();
  },

  deselectAll() {
    state.selectedPlayers = [];
    this.refreshPlayersList();
  },

  updateSelectionCounter() {
    const counter = document.getElementById("selectedCount");
    counter.textContent = `${state.selectedPlayers.length} selectați`;
  },

  validateSelection() {
    const isValid = state.selectedPlayers.length >= 4;
    document.getElementById("goToBracketBtn").disabled = !isValid;

    // Afișează/ascunde secțiunea de echipe
    const teamsSection = document.querySelector(".teams-section");
    if (isValid) {
      teamsSection.classList.remove("hidden");
    } else {
      teamsSection.classList.add("hidden");
    }

    return isValid;
  },
};

const teamManager = {
  // Lista de nume predefinite pentru echipe
  teamNames: [
    "🦁 Leii Neînfricați",
    "🦊 Vulpile Șirete",
    "🐺 Lupii Urlători",
    "🐉 Dragonii Nemuritori",
    "🦅 Vulturii Supremi",
    "🦂 Scorpionii Letali",
    "🐘 Elefanții Legendari",
    "🦉 Bufnițele Înțelepte",
    "🦄 Unicornii Magici",
    "🦏 Rinocerii Invincibili",
    "🐢 Țestoasele Nija",
    "🐝 Albinele Regale",
    "🦔 Aricii Curajoși",
    "🦜 Papagalii Colorați",
    "🦈 Rechinii Nemiloși",
    "🐬 Delfinii Aventurieri",
  ],

  // Funcție pentru a obține nume aleatorii unice pentru echipe
  getRandomTeamNames(count) {
    const shuffled = [...this.teamNames].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },

  // Calculează distribuția optimă a jucătorilor în echipe
  calculateTeamDistribution(totalPlayers, numberOfTeams) {
    const basePlayersPerTeam = Math.floor(totalPlayers / numberOfTeams);
    const remainingPlayers = totalPlayers % numberOfTeams;

    // Creăm un array cu numărul de jucători pentru fiecare echipă
    const distribution = Array(numberOfTeams).fill(basePlayersPerTeam);

    // Distribuim jucătorii rămași unul câte unul
    for (let i = 0; i < remainingPlayers; i++) {
      distribution[i]++;
    }

    return distribution;
  },

  // Generează echipele cu distribuția calculată
  generateTeams() {
    const numberOfTeams = parseInt(document.getElementById("teamsCount").value);
    const playersPerTeam = parseInt(document.getElementById("teamSize").value);
    const selectedPlayers = [...state.selectedPlayers];

    // Validări
    if (!numberOfTeams || numberOfTeams < 2 || numberOfTeams > 16) {
      alert("Introduceți un număr valid de echipe (între 2 și 16)");
      return false;
    }

    if (!playersPerTeam || playersPerTeam < 1) {
      alert("Introduceți un număr valid de jucători per echipă (minim 1)");
      return false;
    }

    if (selectedPlayers.length < numberOfTeams) {
      alert(
        `Aveți nevoie de cel puțin ${numberOfTeams} jucători pentru ${numberOfTeams} echipe`
      );
      return false;
    }

    // Amestecă aleator jucătorii
    const shuffledPlayers = selectedPlayers.sort(() => Math.random() - 0.5);

    // Calculează distribuția optimă
    const distribution = this.calculateTeamDistribution(
      selectedPlayers.length,
      numberOfTeams
    );

    // Obține nume aleatorii pentru echipe
    const teamNames = this.getRandomTeamNames(numberOfTeams);

    // Creează echipele
    state.teams = [];
    let playerIndex = 0;

    distribution.forEach((teamSize, index) => {
      const teamMembers = shuffledPlayers.slice(
        playerIndex,
        playerIndex + teamSize
      );
      state.teams.push({
        name: teamNames[index],
        members: teamMembers,
        targetSize: playersPerTeam,
      });
      playerIndex += teamSize;
    });

    this.refreshTeamsUI();
    storage.save();
    return true;
  },

  refreshTeamsUI() {
    const container = document.getElementById("teamsContainer");
    container.innerHTML = "";

    state.teams.forEach((team) => {
      const teamEl = document.createElement("div");
      teamEl.className = "team";

      // Adăugăm informații despre dimensiunea echipei
      const actualSize = team.members.length;
      const targetSize = team.targetSize;
      const sizeInfo =
        actualSize === targetSize
          ? `(${actualSize} membri)`
          : `(${actualSize}/${targetSize} membri)`;

      teamEl.innerHTML = `
              <h4>
                ${team.name}
                <div class="team-size">${sizeInfo}</div>
              </h4>
              <div class="team-members">
                  ${team.members
                    .map((member) => `<div class="team-member">${member}</div>`)
                    .join("")}
              </div>
          `;
      container.appendChild(teamEl);
    });
  },

  clearTeams() {
    // Curăță state
    state.teams = [];

    // Curăță inputurile
    document.getElementById("teamsCount").value = "4";
    document.getElementById("teamSize").value = "2";

    // Curăță containerul de echipe
    document.getElementById("teamsContainer").innerHTML = "";

    // Salvează starea
    storage.save();
  },
};

const bracketManager = {
  // Calculate the next power of 2
  getNextPowerOfTwo(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  },

  // Generate properly balanced pairs with BYEs
  generatePairs(participants) {
    const totalSpots = this.getNextPowerOfTwo(participants.length);
    const numByes = totalSpots - participants.length;

    // Create a copy of participants and shuffle it
    let teams = [...participants].sort(() => Math.random() - 0.5);

    // Create the full array with required length
    const fullBracket = Array(totalSpots).fill(null);

    // Calculate optimal positions for real teams (not BYEs)
    const teamPositions = [];
    for (let i = 0; i < totalSpots; i++) {
      teamPositions.push(i);
    }

    // Shuffle the positions to ensure random distribution
    teamPositions.sort(() => Math.random() - 0.5);

    // Place teams in their positions
    teams.forEach((team, index) => {
      fullBracket[teamPositions[index]] = team;
    });

    // Create pairs from the full bracket
    const pairs = [];
    for (let i = 0; i < fullBracket.length; i += 2) {
      pairs.push([fullBracket[i], fullBracket[i + 1]]);
    }

    return pairs;
  },

  initializeResults(totalParticipants) {
    const rounds = Math.ceil(Math.log2(totalParticipants));
    return Array(rounds).fill([]);
  },

  countActiveTeams(teams) {
    // Count non-empty teams in the first round
    return teams.filter(
      (match) =>
        (match[0] !== null && match[0] !== undefined) ||
        (match[1] !== null && match[1] !== undefined)
    ).length;
  },

  initBracket() {
    const participants =
      state.teams.length > 0
        ? state.teams.map((team) => team.name)
        : state.selectedPlayers;

    const minimalData = {
      teams: this.generatePairs(participants),
      results: this.initializeResults(participants.length),
    };

    $("#tournamentBracket").bracket({
      init: minimalData,
      disableTeamEdit: true, // Dezactivează editarea numelor echipelor
      disableToolbar: true, // Dezactivează toolbar-ul pentru ajustări
      teamWidth: 200,
      scoreWidth: 50,
      matchMargin: 70,
      roundMargin: 80,
      centerConnectors: true,
      save: (data, userData) => {
        state.bracketData = data;
        storage.save();
        setTimeout(() => this.initTeamTooltips(), 100);
      },
    });

    // Adăugăm un mic delay pentru a ne asigura că bracket-ul este complet încărcat
    setTimeout(() => {
      this.initTeamTooltips();
    }, 100);
  },

  initTeamTooltips() {
    // Ștergem orice tooltip existent
    const existingTooltip = document.querySelector(".team-tooltip");
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // Creăm elementul pentru tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "team-tooltip";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    // Găsim toate elementele de echipă
    const teamElements = document.querySelectorAll(".jQBracket .team");

    teamElements.forEach((teamEl) => {
      // Găsim elementul care conține numele echipei (primul div din .team)
      const teamNameEl = teamEl.querySelector("div");
      if (!teamNameEl) return;

      // Curățăm textul de "--" de la sfârșit și spații extra
      const teamName = teamNameEl.textContent.trim().replace(/--$/, "");

      // Găsim echipa în state folosind o potrivire mai flexibilă
      const team = state.teams.find((t) => {
        // Normalizăm ambele string-uri pentru comparație
        const normalizedTeamName = teamName.toLowerCase().trim();
        const normalizedStateName = t.name.toLowerCase().trim();
        return normalizedTeamName === normalizedStateName;
      });

      if (team) {
        const handleMouseEnter = (e) => {
          const members = team.members
            .map((member) => `<li>${member}</li>`)
            .join("");

          tooltip.innerHTML = `
            <strong>${team.name}</strong>
            <ul>${members}</ul>
          `;

          tooltip.style.display = "block";

          // Poziționăm tooltip-ul
          const rect = teamEl.getBoundingClientRect();
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const scrollX = window.scrollX || document.documentElement.scrollLeft;

          tooltip.style.top = `${
            rect.top + scrollY - tooltip.offsetHeight - 10
          }px`;
          tooltip.style.left = `${rect.left + scrollX}px`;
        };

        const handleMouseLeave = () => {
          tooltip.style.display = "none";
        };

        // Adăugăm event listeners pe întregul element .team
        teamEl.addEventListener("mouseenter", handleMouseEnter);
        teamEl.addEventListener("mouseleave", handleMouseLeave);

        // Adăugăm și pe elementul div interior (numele echipei)
        teamNameEl.addEventListener("mouseenter", handleMouseEnter);
        teamNameEl.addEventListener("mouseleave", handleMouseLeave);

        // Indicatorul vizual pentru tooltip
        teamEl.style.cursor = "help";
        teamNameEl.style.cursor = "help";
      }
    });
  },
  // Adaugă în bracketManager
  toggleTeamsDropdown(event) {
    if (event) {
      event.stopPropagation(); // Previne propagarea click-ului
    }

    const dropdown = document.getElementById("teamsDropdown");
    const content = dropdown.querySelector(".teams-dropdown-content");

    if (dropdown.classList.contains("hidden")) {
      // Populăm și afișăm dropdown-ul
      content.innerHTML = state.teams
        .map(
          (team) => `
            <div class="dropdown-team">
                <div class="dropdown-team-header">
                    ${team.name}
                </div>
                <div class="dropdown-team-members">
                    ${team.members
                      .map(
                        (member) => `
                        <div class="dropdown-team-member">
                            ${member}
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
        )
        .join("");

      dropdown.classList.remove("hidden");

      // Adăugăm event listener pentru click în afara dropdown-ului
      setTimeout(() => {
        document.addEventListener("click", this.closeDropdown);
      }, 0);
    } else {
      this.closeDropdown();
    }
  },

  closeDropdown(event) {
    const dropdown = document.getElementById("teamsDropdown");
    const button = document.getElementById("showTeamsBtn");

    // Verificăm dacă click-ul a fost pe dropdown sau pe buton
    if (
      event &&
      (dropdown.contains(event.target) || button.contains(event.target))
    ) {
      return;
    }

    dropdown.classList.add("hidden");
    document.removeEventListener("click", bracketManager.closeDropdown);
  },

  regenerateBracket() {
    if (
      confirm(
        "Sigur doriți să regenerați bracket-ul? Toate rezultatele vor fi pierdute."
      )
    ) {
      this.initBracket();
      // Reinițializăm tooltip-urile după regenerarea bracket-ului
      setTimeout(() => this.initTeamTooltips(), 100);
    }
  },
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Curăță câmpurile la încărcare
  document.getElementById("teamsCount").value = "4";
  document.getElementById("teamSize").value = "2";
  // Încarcă datele din localStorage și verifică rezultatul
  if (!storage.load()) {
    // Dacă nu există date în localStorage, curățăm totul
    state.teams = [];
    state.classes = {};
    state.selectedClasses = [];
    state.selectedPlayers = [];
    state.bracketData = null;
    state.currentPhase = "selection";

    // Curățăm și UI-ul
    document.getElementById("teamsContainer").innerHTML = "";
    document.getElementById("classesList").innerHTML = "";
    document.getElementById("playersList").innerHTML = "";
  } else {
    // Dacă există date, actualizăm UI-ul
    classManager.refreshClassesList();
    playerManager.refreshPlayersList();
    teamManager.refreshTeamsUI();
  }
  // Import JSON
  document.getElementById("importBtn").onclick = () => {
    document.getElementById("jsonInput").click();
  };

  document.getElementById("jsonInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      classManager.updateClasses(data);
    } catch (err) {
      console.error("Eroare la importul JSON:", err);
      alert("Eroare la importul fișierului JSON");
    }
  };

  // Adăugare participant individual
  document.getElementById("addPlayer").onclick = () => {
    const input = document.getElementById("playerName");
    if (playerManager.addPlayer(input.value)) {
      input.value = "";
    }
  };

  document.getElementById("playerName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const input = document.getElementById("playerName");
      if (playerManager.addPlayer(input.value)) {
        input.value = "";
      }
    }
  });

  // Adăugare multiplă
  document.getElementById("addMultiple").onclick = () => {
    const textarea = document.getElementById("multipleNames");
    const added = playerManager.addMultiplePlayers(textarea.value);
    if (added > 0) {
      textarea.value = "";
    }
  };

  // Toggle input mode
  document.getElementById("toggleInput").onclick = () => {
    const singleInput = document.querySelector(".single-input");
    const multiInput = document.querySelector(".multi-input");
    singleInput.classList.toggle("hidden");
    multiInput.classList.toggle("hidden");
  };

  // Controale selecție
  document.getElementById("selectAll").onclick = () =>
    playerManager.selectAll();
  document.getElementById("deselectAll").onclick = () =>
    playerManager.deselectAll();

  // Generare echipe
  document.getElementById("generateTeams").onclick = () => {
    if (teamManager.generateTeams()) {
      document.querySelector(".teams-section").classList.remove("hidden");
    }
  };

  // handler pentru butonul de ștergere echipe
  document.getElementById("clearTeams").onclick = () => {
    teamManager.clearTeams();
  };

  // Navigare între secțiuni si generare bracket
  document.getElementById("goToBracketBtn").onclick = () => {
    if (playerManager.validateSelection()) {
      // Ascundem secțiunile anterioare
      document.querySelector(".top-section").classList.add("hidden");
      document.querySelector(".main-content").classList.add("hidden");
      document.querySelector(".teams-section").classList.add("hidden");
      document.querySelector(".navigation").classList.add("hidden");

      // Afișăm bracket-ul
      document.querySelector(".bracket-section").classList.remove("hidden");

      // Inițializăm bracket-ul
      bracketManager.initBracket();

      // Actualizăm faza curentă
      state.currentPhase = "bracket";
      storage.save();
    }
  };

  const showTeamsBtn = document.getElementById("showTeamsBtn");
  if (showTeamsBtn) {
    showTeamsBtn.addEventListener("click", (event) => {
      bracketManager.toggleTeamsDropdown(event);
    });
  }

  // Adăugăm event listeners pentru controalele bracket-ului
  document.getElementById("regenerateBracket").onclick = () => {
    bracketManager.regenerateBracket();
  };

  document.getElementById("backToConfigBtn").onclick = () => {
    document.querySelector(".bracket-section").classList.add("hidden");
    document.querySelector(".top-section").classList.remove("hidden");
    document.querySelector(".main-content").classList.remove("hidden");
    document.querySelector(".teams-section").classList.remove("hidden");
    document.querySelector(".navigation").classList.remove("hidden");
    state.currentPhase = "selection";
    storage.save();
  };
});

window.addEventListener("beforeunload", () => {
  storage.clearTempData();
});
