const mysql = require("mysql2");
require("dotenv").config();

// Create MySQL database connection using local database credentials
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
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