const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servim fișierele statice din folderul public
app.use(express.static("public"));

// Route pentru a obține lista categoriilor disponibile pentru un tip de joc
app.get("/api/categories/:type", async (req, res) => {
  const type = req.params.type;
  try {
    const categoriesPath = path.join(__dirname, `../data/questions/${type}`);
    const files = await fs.readdir(categoriesPath);
    const categories = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
    res.json(categories);
  } catch (error) {
    console.error("Error loading categories:", error);
    res.status(404).json({ error: "Categories not found" });
  }
});

// Route pentru a obține datele unei categorii specifice
app.get("/api/questions/:type/:category", async (req, res) => {
  const { type, category } = req.params;
  try {
    const filePath = path.join(
      __dirname,
      `../data/questions/${type}/${category}.json`
    );
    // Înlocuim require cu fs.readFile
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);
    res.json(data);
  } catch (error) {
    console.error("Error loading category:", error);
    res.status(404).json({ error: "Category not found" });
  }
});

// Route pentru pagina principală (fallback la index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Route specific pentru competition_manager
app.use(
  "/competition_manager",
  express.static(path.join(__dirname, "public/competition_manager"))
);

// Ascultăm pe portul specificat
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
