const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// GET dashboard statistics and aggregated football data
router.get("/stats", dashboardController.getStats);

module.exports = router;