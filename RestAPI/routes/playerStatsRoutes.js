const express = require("express");
const router = express.Router();
const playerStatsController = require("../controllers/playerStatsController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all player statistics and performance data
router.get("/", playerStatsController.getPlayerStats);

// PUT update player statistics by player ID (protected route)
router.put("/:id", verifyToken, playerStatsController.updatePlayerStats);

module.exports = router;