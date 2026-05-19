const express = require("express");
const router = express.Router();
const leagueController = require("../controllers/leagueController");

// GET league table data from the database
router.get("/", leagueController.getLeagueTable);

module.exports = router;