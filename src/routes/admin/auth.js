const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/database");

const router = express.Router();

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { username, password, remember_me } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password harus diisi",
      });
    }

    // Find admin by username
    const [admins] = await pool.execute(
      "SELECT * FROM admins WHERE username = ? AND status = ?",
      [username, "active"]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    const admin = admins[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    // Update last login
    await pool.execute("UPDATE admins SET last_login = NOW() WHERE id = ?", [
      admin.id,
    ]);

    // Generate JWT token
    const tokenPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };

    const tokenOptions = remember_me
      ? { expiresIn: "30d" } // 30 days if remember me
      : { expiresIn: "24h" }; // 24 hours default

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "school_admin_secret",
      tokenOptions
    );

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          full_name: admin.full_name,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logout berhasil",
  });
});

// Get Profile
router.get("/profile", authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

module.exports = router;
