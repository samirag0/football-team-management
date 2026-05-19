const jwt = require("jsonwebtoken");

// Middleware used to verify JWT authentication tokens
const verifyToken = (req, res, next) => {
    // Retrieve the authorization header from the incoming request
  const authHeader = req.headers["authorization"];

  // Prevent access if no token is provided
  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied"
    });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.split(" ")[1];

  try {

    // Verify token using the secret key stored in environment variables
    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Attach decoded user information to the request object
    req.user = verified;

    // Continue to the protected route
    next();

  } catch (err) {

    // Return error if token is invalid or expired
    return res.status(403).json({
      message: "Invalid token"
    });

  }

};

module.exports = { verifyToken };