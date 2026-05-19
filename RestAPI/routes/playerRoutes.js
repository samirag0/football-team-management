const express = require("express");
const router = express.Router();
const playerController = require("../controllers/playerController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all players and their associated team information
router.get("/", playerController.getAllPlayers);

// POST create a new player (protected route)
router.post("/", verifyToken, playerController.addPlayer);

// DELETE a player and linked statistics by player ID (protected route)
router.delete("/:id", verifyToken, playerController.deletePlayer);

// PUT update player information by player ID (protected route)
router.put("/:id", verifyToken, playerController.updatePlayer);

module.exports = router;