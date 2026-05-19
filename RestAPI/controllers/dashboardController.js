const db = require("../db");

exports.getStats = (req, res) => {
  const stats = {};

  // Total Players
  db.query("SELECT COUNT(*) AS totalPlayers FROM Players", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalPlayers = result[0].totalPlayers;

    // Total Teams
    db.query("SELECT COUNT(*) AS totalTeams FROM Teams", (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalTeams = result[0].totalTeams;

      // Total Matches
      db.query("SELECT COUNT(*) AS totalMatches FROM Matches", (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalMatches = result[0].totalMatches;

        // Average Age
        db.query("SELECT AVG(age) AS averageAge FROM Players", (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.averageAge = Math.round(result[0].averageAge || 0);

          res.json(stats);
        });
      });
    });
  });
};