const db = require("../db");

// GET all the teams
exports.getAllTeams = (req, res) => {
  const sql = `
    SELECT
      Teams.team_id,
      Teams.team_name,
      Teams.coach_name,
      Teams.primary_color,
      Teams.secondary_color,
      Teams.stadium_location,
      Teams.logo_url,
      COUNT(Players.player_id) AS player_count
    FROM Teams
    LEFT JOIN Players ON Teams.team_id = Players.team_id
    GROUP BY 
      Teams.team_id,
      Teams.team_name,
      Teams.coach_name,
      Teams.primary_color,
      Teams.secondary_color,
      Teams.stadium_location,
      Teams.logo_url
    ORDER BY Teams.team_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// Add each team
exports.addTeam = (req, res) => {

  console.log("ADD TEAM ROUTE HIT");
  console.log("ADD TEAM BODY:", req.body);

  const {
    team_name,
    coach_name,
    primary_color,
    secondary_color,
    logo_url,
    stadium_location,
  } = req.body;

  if (!team_name || !coach_name) {
    return res.status(400).json({
      error: "Team name and coach name are required",
    });
  }

  const checkSql = "SELECT * FROM Teams WHERE team_name = ?";

  db.query(checkSql, [team_name], (checkErr, results) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }

    if (results.length > 0) {
      return res.status(400).json({
        error: "Team already exists",
      });
    }

    const insertSql = `
      INSERT INTO Teams (
        team_name,
        coach_name,
        primary_color,
        secondary_color,
        stadium_location,
        logo_url
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [
        team_name,
        coach_name,
        primary_color || "#2f4356",
        secondary_color || "#5d7f8c",
        stadium_location || null,
        logo_url || null,
      ],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          message: "Team added successfully",
          team_id: result.insertId,
        });
      }
    );
  });
};

// Update the teams
exports.updateTeam = (req, res) => {

  console.log("UPDATE TEAM ROUTE HIT");
  console.log("UPDATE TEAM BODY:", req.body);

  const { id } = req.params;

  const {
    team_name,
    coach_name,
    primary_color,
    secondary_color,
    stadium_location,
    logo_url
  } = req.body;

  if (!team_name || !coach_name) {
    return res.status(400).json({
      error: "Team name and coach name are required",
    });
  }

  const sql = `
    UPDATE Teams
    SET
      team_name = ?,
      coach_name = ?,
      primary_color = ?,
      secondary_color = ?,
      stadium_location = ?,
      logo_url = ?
    WHERE team_id = ?
  `;

  db.query(
    sql,
    [
      team_name,
      coach_name,
      primary_color || "#2f4356",
      secondary_color || "#5d7f8c",
      stadium_location || null,
      logo_url || null,
      id
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({ message: "Team updated successfully" });
    }
  );
};

// Delete
exports.deleteTeam = (req, res) => {
  const { id } = req.params;

  const checkSql = `
    SELECT 
      (SELECT COUNT(*) FROM Players WHERE team_id = ?) AS player_count,
      (SELECT COUNT(*) FROM Matches WHERE team1_id = ? OR team2_id = ?) AS match_count
  `;

  db.query(checkSql, [id, id, id], (checkErr, results) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }

    const { player_count, match_count } = results[0];

    if (player_count > 0 || match_count > 0) {
      return res.status(400).json({
        error: "Cannot delete team: linked to players or matches",
      });
    }

    const deleteSql = "DELETE FROM Teams WHERE team_id = ?";

    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({ message: "Team deleted successfully" });
    });
  });
};