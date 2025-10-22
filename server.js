// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3001; // Port for our backend server

app.use(cors()); // Enable Cross-Origin Resource Sharing

// An endpoint to get game data
app.get("/api/games", (req, res) => {
  const filePath = path.join(__dirname, "games.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading games.json:", err);
      return res.status(500).send("Error reading game data.");
    }
    res.json(JSON.parse(data));
  });
});

// An endpoint to get prop data
app.get("/api/props", (req, res) => {
  const filePath = path.join(__dirname, "player_props.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading player_props.json:", err);
      return res.status(500).send("Error reading prop data.");
    }
    res.json(JSON.parse(data));
  });
});

app.listen(port, () => {
  console.log(
    `NOVA Sports Capital API server running at http://localhost:${port}`
  );
});

// Add this new endpoint in server.js

app.get("/api/system_picks", (req, res) => {
  const filePath = path.join(__dirname, "system_picks.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading system_picks.json:", err);
      // If the file doesn't exist, send back an empty array
      if (err.code === "ENOENT") {
        return res.json([]);
      }
      return res.status(500).send("Error reading system picks data.");
    }
    res.json(JSON.parse(data));
  });
});
