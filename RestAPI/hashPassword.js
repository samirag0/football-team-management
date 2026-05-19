const bcrypt = require("bcrypt");

// Generate a bcrypt hash for testing or manually updating user passwords
async function hashPassword() {

  // Hash plaintext password using 10 salt rounds
  const hashed = await bcrypt.hash("player2", 10);

  console.log(hashed);

}

// Execute password hashing function
hashPassword();