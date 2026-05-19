const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all football news articles
router.get("/", newsController.getNews);

// POST create a new news article (protected route)
router.post("/", verifyToken, newsController.addNews);

module.exports = router;