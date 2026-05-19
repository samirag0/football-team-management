const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all registered users (protected route)
router.get("/", verifyToken, userController.getAllUsers);

// POST create a new user account with secure password hashing (protected route)
router.post("/", verifyToken, userController.addUser);

// DELETE a user account by user ID (protected route)
router.delete("/:id", verifyToken, userController.deleteUser);

module.exports = router;