const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all football teams and related squad information
router.get("/", teamController.getAllTeams);

// POST create a new football team (protected route)
router.post("/", verifyToken, teamController.addTeam);

// PUT update team information by team ID (protected route)
router.put("/:id", verifyToken, teamController.updateTeam);

// DELETE a football team by team ID (protected route)
router.delete("/:id", verifyToken, teamController.deleteTeam);

module.exports = router;