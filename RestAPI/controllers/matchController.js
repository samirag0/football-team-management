const db = require("../db");

// Convert score input into a valid number or null
const normaliseScoreValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

// Build score string in the format "home-away"
const buildScore = (homeScore, awayScore) => {
  const home = normaliseScoreValue(homeScore);
  const away = normaliseScoreValue(awayScore);

  if (home === null || away === null) return null;
  return `${home}-${away}`;
};

// GET all matches with team names, colours and score details
exports.getAllMatches = (req, res) => {
  const sql = `
    SELECT
      Matches.match_id,
      Matches.team1_id AS home_team_id,
      Matches.team2_id AS away_team_id,
      t1.team_name AS home_team,
      t2.team_name AS away_team,
      t1.primary_color AS home_primary_color,
      t1.secondary_color AS home_secondary_color,
      t2.primary_color AS away_primary_color,
      t2.secondary_color AS away_secondary_color,
      DATE_FORMAT(Matches.match_date, '%Y-%m-%d') AS match_date,
      Matches.home_score,
      Matches.away_score,
      Matches.score
    FROM Matches
    JOIN Teams t1 ON Matches.team1_id = t1.team_id
    JOIN Teams t2 ON Matches.team2_id = t2.team_id
    ORDER BY Matches.match_date ASC, Matches.match_id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// POST create a new match after validating team names and match date
exports.addMatch = (req, res) => {
  const { home_team, away_team, match_date, home_score, away_score } = req.body;

  // Validate required match fields
  if (!home_team || !away_team || !match_date) {
    return res.status(400).json({
      error: "home_team, away_team, and match_date are required",
    });
  }

  // Prevent a team from playing against itself
  if (home_team.trim().toLowerCase() === away_team.trim().toLowerCase()) {
    return res.status(400).json({
      error: "Home team and away team cannot be the same",
    });
  }

  const findTeamsSql = `
    SELECT team_id, team_name
    FROM Teams
    WHERE LOWER(team_name) IN (LOWER(?), LOWER(?))
  `;

  db.query(findTeamsSql, [home_team, away_team], (teamErr, teamResults) => {
    if (teamErr) {
      return res.status(500).json({ error: teamErr.message });
    }

    // Match submitted team names to existing database records
    const homeTeam = teamResults.find(
      (team) => team.team_name.toLowerCase() === home_team.toLowerCase()
    );

    const awayTeam = teamResults.find(
      (team) => team.team_name.toLowerCase() === away_team.toLowerCase()
    );

    if (!homeTeam || !awayTeam) {
      return res.status(404).json({ error: "One or both teams were not found" });
    }

    // Clean score values and generate combined score string
    const cleanHomeScore = normaliseScoreValue(home_score);
    const cleanAwayScore = normaliseScoreValue(away_score);
    const score = buildScore(cleanHomeScore, cleanAwayScore);

    const insertSql = `
      INSERT INTO Matches (
        team1_id,
        team2_id,
        match_date,
        home_score,
        away_score,
        score
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [
        homeTeam.team_id,
        awayTeam.team_id,
        match_date,
        cleanHomeScore,
        cleanAwayScore,
        score,
      ],
      (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        res.status(201).json({
          message: "Match added successfully",
          match_id: result.insertId,
        });
      }
    );
  });
};

// PUT update the score for an existing match
exports.updateMatchScore = (req, res) => {
  const { id } = req.params;
  const { home_score, away_score } = req.body;

  const cleanHomeScore = normaliseScoreValue(home_score);
  const cleanAwayScore = normaliseScoreValue(away_score);
  const score = buildScore(cleanHomeScore, cleanAwayScore);

  const sql = `
    UPDATE Matches
    SET home_score = ?, away_score = ?, score = ?
    WHERE match_id = ?
  `;

  db.query(sql, [cleanHomeScore, cleanAwayScore, score, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.json({ message: "Match score updated successfully" });
  });
};

// GET all goals across every match
exports.getAllGoals = (req, res) => {
  const sql = `
    SELECT
      MatchGoals.goal_id,
      MatchGoals.match_id,
      MatchGoals.minute,
      Players.player_id,
      Players.player_name,
      Teams.team_id,
      Teams.team_name
    FROM MatchGoals
    JOIN Players ON MatchGoals.player_id = Players.player_id
    JOIN Teams ON MatchGoals.team_id = Teams.team_id
    ORDER BY MatchGoals.match_id ASC, MatchGoals.minute ASC, MatchGoals.goal_id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// GET all goals for a specific match
exports.getGoalsForMatch = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      MatchGoals.goal_id,
      MatchGoals.match_id,
      MatchGoals.minute,
      Players.player_id,
      Players.player_name,
      Teams.team_id,
      Teams.team_name
    FROM MatchGoals
    JOIN Players ON MatchGoals.player_id = Players.player_id
    JOIN Teams ON MatchGoals.team_id = Teams.team_id
    WHERE MatchGoals.match_id = ?
    ORDER BY MatchGoals.minute ASC, MatchGoals.goal_id ASC
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// POST add a goal scorer to a match and update player statistics
exports.addMatchGoal = (req, res) => {
  const { id } = req.params;
  const { player_id, team_id, minute } = req.body;

  if (!player_id || !team_id) {
    return res.status(400).json({
      error: "player_id and team_id are required",
    });
  }

  const insertGoalSql = `
    INSERT INTO MatchGoals (match_id, player_id, team_id, minute)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertGoalSql, [id, player_id, team_id, minute || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Update PlayerStats table, or create a stats row if one does not exist
    const updateStatsSql = `
      INSERT INTO PlayerStats (player_id, goals)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE goals = goals + 1
    `;

    db.query(updateStatsSql, [player_id], (statsErr) => {
      if (statsErr) return res.status(500).json({ error: statsErr.message });

      res.status(201).json({
        message: "Goal scorer added and player stats updated successfully",
        goal_id: result.insertId,
      });
    });
  });
};