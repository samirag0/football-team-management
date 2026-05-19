const db = require("../db");

// GET calculated league table based on completed match results
exports.getLeagueTable = (req, res) => {
  const sql = `
    SELECT
      Matches.match_id,
      t1.team_name AS home_team,
      t2.team_name AS away_team,
      Matches.score
    FROM Matches
    JOIN Teams t1 ON Matches.team1_id = t1.team_id
    JOIN Teams t2 ON Matches.team2_id = t2.team_id
    WHERE Matches.score IS NOT NULL AND Matches.score != ''
  `;

  db.query(sql, (err, matches) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Store calculated statistics for each team    
    const table = {};

    // Create a default league table row when a team appears for the first time
    function createTeam(teamName) {
      if (!table[teamName]) {
        table[teamName] = {
          team: teamName,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };
      }
    }

    // Process each completed match and calculate team statistics
    matches.forEach((match) => {
      const scoreParts = match.score.split("-");

      if (scoreParts.length !== 2) return;

      const homeGoals = Number(scoreParts[0].trim());
      const awayGoals = Number(scoreParts[1].trim());

      // Ignore scores that cannot be converted into numbers
      if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) return;

      createTeam(match.home_team);
      createTeam(match.away_team);

      const home = table[match.home_team];
      const away = table[match.away_team];

      // Update matches played
      home.played += 1;
      away.played += 1;

      // Update goals scored and conceded
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;

      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;

      // Apply football points system: win = 3, draw = 1, loss = 0
      if (homeGoals > awayGoals) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (homeGoals < awayGoals) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });
    
    // Convert object into array and calculate goal difference
    const leagueTable = Object.values(table).map((team) => ({
      ...team,
      goalDifference: team.goalsFor - team.goalsAgainst,
    }));

    // Sort league table by points, then goal difference, then goals scored
    leagueTable.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    res.json(leagueTable);
  });
};