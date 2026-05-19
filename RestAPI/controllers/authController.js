const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// LOGIN
exports.login = (req, res) => {

  const { username, password } = req.body;

  const sql = "SELECT * FROM Users WHERE username = ?";

  db.query(sql, [username], async (err, results) => {

    if (err) {
      return res.status(500).json({
        error: err.message
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const user = results[0];

    // IMPORTANT
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    console.log("Entered password:", password);
    console.log("Stored hash:", user.password);
    console.log("Password match:", passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.json({
      message: "Login successful",
      token,

      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
    });

  });

};