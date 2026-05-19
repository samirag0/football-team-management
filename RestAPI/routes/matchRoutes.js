const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all football matches
router.get("/", matchController.getAllMatches);

// GET all recorded goals across matches
router.get("/goals", matchController.getAllGoals);

// GET all goals for a specific match using match ID
router.get("/:id/goals", matchController.getGoalsForMatch);

// POST create a new football match (protected route)
router.post("/", verifyToken, matchController.addMatch);

// POST add a goal to a specific match (protected route)
router.post("/:id/goals", verifyToken, matchController.addMatchGoal);

// PUT update match score information (protected route)
router.put("/:id", verifyToken, matchController.updateMatchScore);

module.exports = router;
