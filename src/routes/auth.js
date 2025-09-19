const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("Login attempt for:", username);

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // FIXED: Check database column names
    const [users] = await pool.execute(
      "SELECT * FROM admin_users WHERE (username = ? OR email = ?) AND is_active = 1",
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // FIXED: Check correct password column name
    // If your column is 'password', use user.password
    // If your column is 'password_hash', use user.password_hash
    const passwordToCheck = user.password_hash || user.password;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, passwordToCheck);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // FIXED: Generate JWT token with correct payload structure
    const token = jwt.sign(
      {
        userId: user.id, // <- IMPORTANT: Use 'userId' not 'id'
        username: user.username,
        email: user.email || "",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Update last login
    await pool.execute(
      "UPDATE admin_users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email || "",
          full_name: user.full_name || user.username,
        },
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Profile route
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: req.user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Logout route
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logout successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout error",
      error: error.message,
    });
  }
});

module.exports = router;
