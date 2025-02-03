const fs = require("fs");
const path = require("path");

// Configurare folder - schimbați doar această variabilă
const TARGET_FOLDER = "fructe"; // numele folderului din care vreți să listați fișierele (ex: 'animals', 'foods' etc.)

// Căi relative
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, "..", ".."); // mergem sus 2 nivele din data/questions
const sourcePath = path.join(
  projectRoot,
  "public",
  "assets",
  "database",
  "images",
  TARGET_FOLDER
);
const outputPath = path.join(scriptDir, "names.txt");

// Funcție pentru listarea fișierelor
function listFiles() {
  try {
    // Verifică dacă folderul sursă există
    if (!fs.existsSync(sourcePath)) {
      console.error(
        `Folderul ${TARGET_FOLDER} nu există la calea: ${sourcePath}`
      );
      return;
    }

    // Citește fișierele
    const files = fs.readdirSync(sourcePath);

    // Filtrează doar fișierele (exclude folderele)
    const fileNames = files.filter((file) => {
      const filePath = path.join(sourcePath, file);
      return fs.statSync(filePath).isFile();
    });

    // Scrie rezultatul în _names.txt
    fs.writeFileSync(outputPath, fileNames.join("\n"));

    console.log(`✅ Succes! ${fileNames.length} fișiere au fost listate în:`);
    console.log(outputPath);
    console.log("\nFișierele listate sunt din folderul:");
    console.log(sourcePath);
  } catch (error) {
    console.error("❌ Eroare:", error.message);
  }
}

// Execută funcția
listFiles();
