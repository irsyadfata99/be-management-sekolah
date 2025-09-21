const express = require("express");
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

const router = express.Router();

// Dashboard statistics endpoint
router.get(
  "/dashboard-stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("Dashboard stats requested by:", req.user.username);

      // Simple stats with error handling
      let totalStudents = 0;
      let totalArticles = 0;
      let totalPersonnel = 0;

      try {
        const [studentsResult] = await pool.execute(
          "SELECT COUNT(*) as count FROM pendaftar_spmb"
        );
        totalStudents = studentsResult[0].count;
      } catch (error) {
        console.warn("Could not get students count:", error.message);
      }

      try {
        const [articlesResult] = await pool.execute(
          "SELECT COUNT(*) as count FROM artikel WHERE is_published = 1"
        );
        totalArticles = articlesResult[0].count;
      } catch (error) {
        console.warn("Could not get articles count:", error.message);
      }

      try {
        const [personnelResult] = await pool.execute(
          "SELECT COUNT(*) as count FROM school_personnel WHERE is_active = 1"
        );
        totalPersonnel = personnelResult[0].count;
      } catch (error) {
        console.warn("Could not get personnel count:", error.message);
      }

      res.json({
        success: true,
        message: "Dashboard statistics retrieved successfully",
        data: {
          totalStudents,
          totalArticles,
          totalPersonnel,
          recentRegistrations: 5, // Sample data
          lastUpdated: new Date().toISOString(),
          user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
          },
        },
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard statistics",
        error: error.message,
      });
    }
  }
);

module.exports = router;
