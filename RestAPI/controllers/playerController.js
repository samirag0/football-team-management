const db = require("../db");

// GET all players with their assigned team information
exports.getAllPlayers = (req, res) => {
  const sql = `
    SELECT 
      Players.player_id,
      Players.player_name,
      Players.age,
      Players.position,
      Players.team_id,
      Players.profile_image,
      Teams.team_name
    FROM Players
    JOIN Teams ON Players.team_id = Teams.team_id
    ORDER BY Players.player_id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// POST add a new player and automatically create their statistics record
exports.addPlayer = (req, res) => {
  const { player_name, age, position, team_name, profile_image } = req.body;

  if (!player_name || !age || !position || !team_name) {
    return res.status(400).json({
      error: "player_name, age, position, and team_name are all required",
    });
  }

  const findTeamSql = `
    SELECT team_id
    FROM Teams
    WHERE team_name = ?
    LIMIT 1
  `;

  // Find the selected team so the player can be linked using team_id
  db.query(findTeamSql, [team_name], (teamErr, teamResults) => {
    if (teamErr) {
      return res.status(500).json({ error: teamErr.message });
    }

    if (teamResults.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team_id = teamResults[0].team_id;

    const insertPlayerSql = `
      INSERT INTO Players (player_name, age, position, team_id, profile_image)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertPlayerSql,
      [player_name, age, position, team_id, profile_image || null],
      (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        const newPlayerId = result.insertId;

        const insertStatsSql = `
          INSERT INTO PlayerStats 
          (player_id, appearances, goals, assists, yellow_cards, red_cards)
          VALUES (?, 0, 0, 0, 0, 0)
        `;

        db.query(insertStatsSql, [newPlayerId], (statsErr) => {
          if (statsErr) {
            return res.status(500).json({
              error: statsErr.message,
            });
          }

          res.status(201).json({
            message: "Player and player stats added successfully",
            player_id: newPlayerId,
          });
        });
      }
    );
  });
};

// DELETE player and remove linked statistics first to maintain database consistency
exports.deletePlayer = (req, res) => {
  const { id } = req.params;

  const deleteStatsSql = `
    DELETE FROM playerstats
    WHERE player_id = ?
  `;

  db.query(deleteStatsSql, [id], (statsErr) => {
    if (statsErr) {
      return res.status(500).json({ error: statsErr.message });
    }

    const deletePlayerSql = `
      DELETE FROM Players
      WHERE player_id = ?
    `;

    db.query(deletePlayerSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Player not found" });
      }

      res.json({ message: "Player and linked statistics deleted successfully" });
    });
  });
};

// PUT update an existing player and their assigned team
exports.updatePlayer = (req, res) => {
  const { id } = req.params;
  const { player_name, age, position, team_name, profile_image } = req.body;

  if (!player_name || !age || !position || !team_name) {
    return res.status(400).json({
      error: "player_name, age, position, and team_name are all required",
    });
  }

  const findTeamSql = `
    SELECT team_id
    FROM Teams
    WHERE team_name = ?
    LIMIT 1
  `;

  // Find team ID from team name before updating the player record
  db.query(findTeamSql, [team_name], (teamErr, teamResults) => {
    if (teamErr) {
      return res.status(500).json({ error: teamErr.message });
    }

    if (teamResults.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team_id = teamResults[0].team_id;

    const updateSql = `
      UPDATE Players
      SET player_name = ?, age = ?, position = ?, team_id = ?, profile_image = ?
      WHERE player_id = ?
    `;

    db.query(
      updateSql,
      [player_name, age, position, team_id, profile_image || null, id],
      (updateErr, result) => {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Player not found" });
        }

        res.json({ message: "Player updated successfully" });
      }
    );
  });
};