const db = require("../db");

// GET all news
exports.getNews = (req, res) => {
  db.query("SELECT * FROM News ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ADD news
exports.addNews = (req, res) => {
  const { title, content } = req.body;

  db.query(
    "INSERT INTO News (title, content) VALUES (?, ?)",
    [title, content],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "News added successfully" });
    }
  );
};