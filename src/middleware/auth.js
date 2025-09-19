const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE DEBUG ===");
    console.log("Headers received:", req.headers);

    const authHeader = req.headers["authorization"];
    console.log("Auth header:", authHeader);

    if (!authHeader) {
      console.log("❌ No authorization header found");
      return res.status(401).json({
        success: false,
        message: "Access token required",
        debug: "No authorization header provided",
      });
    }

    // Handle both "Bearer TOKEN" and just "TOKEN" formats
    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      console.log("✅ Bearer token extracted");
    } else {
      token = authHeader;
      console.log("✅ Direct token extracted");
    }

    console.log("Token (first 20 chars):", token.substring(0, 20) + "...");

    // Verify JWT
    console.log(
      "JWT Secret (first 10 chars):",
      process.env.JWT_SECRET?.substring(0, 10) + "..."
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded successfully:", decoded);

    // Get user from database - handle both 'id' and 'userId' in token
    const userId = decoded.userId || decoded.id;
    console.log("Looking for user ID:", userId);

    const [users] = await pool.execute(
      "SELECT id, username, email, full_name, is_active FROM admin_users WHERE id = ? AND is_active = 1",
      [userId]
    );

    console.log("Database query result:", users);

    if (users.length === 0) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
        debug: `User ID ${userId} not found or inactive`,
      });
    }

    req.user = users[0];
    console.log("✅ User authenticated:", req.user);
    console.log("=== AUTH MIDDLEWARE END ===");

    next();
  } catch (error) {
    console.log("❌ Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        debug: error.message,
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        debug: error.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        debug: error.message,
      });
    }
  }
};

module.exports = { authenticateToken };
