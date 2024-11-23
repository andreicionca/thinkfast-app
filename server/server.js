const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servim fișierele statice din folderul public
app.use(express.static("public"));

// Route pentru a servi datele JSON
app.get("/api/questions/:type", (req, res) => {
  const type = req.params.type;
  try {
    const filePath = path.join(__dirname, `../data/questions/${type}.json`);
    const data = require(filePath);
    res.json(data);
  } catch (error) {
    console.error("Error loading JSON:", error);
    res.status(404).json({ error: "File not found" });
  }
});

// Route pentru pagina principală (fallback la index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Ascultăm pe portul specificat
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
