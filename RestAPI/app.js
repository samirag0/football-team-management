require("dotenv").config();

const db = require("./db");
const express = require("express");
const cors = require("cors");

// Import route files for API endpoints
const playerRoutes = require("./routes/playerRoutes");
const teamRoutes = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leagueRoutes = require("./routes/leagueRoutes");
const newsRoutes = require("./routes/newsRoutes");
const playerStatsRoutes = require("./routes/playerStatsRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Use deployment port if available, otherwise default to 3000 locally
const PORT = 3000;

// Enable CORS for frontend-backend communication
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Root route used to test if API server is running
app.get("/", (req, res) => {
  res.send("Football API is running");
});

// Register REST API route endpoints
app.use("/api/players", playerRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/league-table", leagueRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/player-stats", playerStatsRoutes);
app.use("/api/users", userRoutes);

// Start Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});