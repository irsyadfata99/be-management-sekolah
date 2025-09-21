// ============================================================================
// 1. FIXED: src/routes/auth.js (Backend Route)
// ============================================================================

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

    // Get user from database
    const [users] = await pool.execute(
      "SELECT * FROM admin_users WHERE (username = ? OR email = ?) AND is_active = 1",
      [username, username]
    );

    if (users.length === 0) {
      console.log("User not found:", username);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];
    console.log("User found:", user.username, "Role:", user.role);

    // Check password
    const passwordToCheck = user.password_hash || user.password;
    const isValidPassword = await bcrypt.compare(password, passwordToCheck);

    if (!isValidPassword) {
      console.log("Invalid password for:", username);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // FIXED: Generate JWT token with CONSISTENT payload structure
    const token = jwt.sign(
      {
        id: user.id, // Use 'id' not 'userId' for consistency
        username: user.username,
        role: user.role || "admin",
        email: user.email || "",
      },
      process.env.JWT_SECRET || "school_template_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Update last login
    await pool.execute(
      "UPDATE admin_users SET last_login = NOW() WHERE id = ?",
      [user.id]
    );

    console.log("Login successful for:", user.username);

    // FIXED: Include role in response
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
          role: user.role || "admin", // IMPORTANT: Include role
        },
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
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email || "",
          full_name: req.user.full_name || "",
          role: req.user.role || "admin",
        },
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
