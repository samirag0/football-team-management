const db = require("../db");

// GET all the players stats
exports.getPlayerStats = (req, res) => {
  const sql = `
    SELECT
      Players.player_id,
      Players.player_name,
      Players.position,
      Teams.team_name,
      PlayerStats.appearances,
      PlayerStats.goals,
      PlayerStats.assists,
      PlayerStats.yellow_cards,
      PlayerStats.red_cards
    FROM PlayerStats
    JOIN Players ON PlayerStats.player_id = Players.player_id
    LEFT JOIN Teams ON Players.team_id = Teams.team_id
    ORDER BY PlayerStats.goals DESC, PlayerStats.assists DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: err.message
      });
    }

    res.json(results);
  });
};

// Update the players stats
exports.updatePlayerStats = (req, res) => {
  const { id } = req.params;

  const {
    appearances,
    goals,
    assists,
    yellow_cards,
    red_cards
  } = req.body;

  const sql = `
    UPDATE PlayerStats
    SET
      appearances = ?,
      goals = ?,
      assists = ?,
      yellow_cards = ?,
      red_cards = ?
    WHERE player_id = ?
  `;

  db.query(
    sql,
    [
      appearances,
      goals,
      assists,
      yellow_cards,
      red_cards,
      id
    ],
    (err) => {
      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json({
        message: "Player stats updated successfully"
      });
    }
  );
};