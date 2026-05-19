const db = require("../db");
const bcrypt = require("bcrypt");
const { sendUserCredentials } = require("../services/emailService");

// GET all users without returning password hashes
exports.getAllUsers = (req, res) => {
  const sql = `
    SELECT user_id, username, email, role
    FROM Users
    ORDER BY role ASC, username ASC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// POST create a new user with hashed password storage
exports.addUser = (req, res) => {
  const { username, email, password, role } = req.body;

  // Validate required user fields
  if (!username || !email || !password || !role) {
    return res.status(400).json({
      error: "Username, email, password and role are required",
    });
  }

  // Restrict user role values to supported roles only
  if (!["admin", "player", "guest"].includes(role)) {
    return res.status(400).json({
      error: "Invalid role selected",
    });
  }

  const checkSql = "SELECT * FROM Users WHERE username = ?";

  // Check username is unique before creating a new account
  db.query(checkSql, [username], async (checkErr, results) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });

    if (results.length > 0) {
      return res.status(400).json({
        error: "Username already exists",
      });
    }

    // Hash password before saving so plaintext passwords are never stored
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO Users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertSql, [username, email, hashedPassword, role], async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      try {
        // Email the original temporary credentials to the new user
        await sendUserCredentials(email, username, password, role);
      } catch (emailErr) {
        return res.status(201).json({
          message: "User created, but email could not be sent",
          user_id: result.insertId,
          email_error: emailErr.message,
        });
      }

      res.status(201).json({
        message: "User created successfully and credentials emailed",
        user_id: result.insertId,
      });
    });
  });
};

// DELETE an existing user account by ID
exports.deleteUser = (req, res) => {

  // Only admins can delete users
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required."
    });
  }

  const { id } = req.params;

  const sql = "DELETE FROM Users WHERE user_id = ?";

  db.query(sql, [id], (err, result) => {

    if (err) {
      return res.status(500).json({
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "User deleted successfully"
    });

  });

};