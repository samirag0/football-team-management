const mysql = require("mysql2");

// Create MySQL database connection using local database credentials
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Root1532!",
  database: "FootballDB"
});

// Attempt database connection and display connection status
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Export database connection for use across controllers and routes
module.exports = db;