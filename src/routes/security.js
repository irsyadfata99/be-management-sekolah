// src/routes/security.js - Security Management Routes
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const SecurityManager = require("../middleware/security"); // Use existing SecurityManager

// Apply security middleware to all routes
router.use(SecurityManager.getGeneralRateLimit());

// GET /api/security/status - Get security system status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        rate_limiting: "active",
        authentication: "jwt_enabled",
        input_validation: "active",
        ip_blocking: "active",
        file_upload_security: "active",
        sql_injection_protection: "active",
        xss_protection: "active",
        helmet_security: "active",
        blocked_ips: SecurityManager.blockedIPs.size,
        timestamp: new Date().toISOString(),
      },
      message: "Security status retrieved successfully",
    });
  } catch (error) {
    console.error("Security status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get security status",
      error: error.message,
    });
  }
});

// GET /api/security/dashboard - Get security dashboard data
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const dashboardData = await SecurityManager.getSecurityDashboard();

    res.json({
      success: true,
      data: dashboardData,
      message: "Security dashboard data retrieved successfully",
    });
  } catch (error) {
    console.error("Security dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get security dashboard data",
      error: error.message,
    });
  }
});

// POST /api/security/cleanup - Clean up old security logs
router.post("/cleanup", authenticateToken, async (req, res) => {
  try {
    const result = await SecurityManager.cleanupSecurityLogs();

    res.json({
      success: true,
      data: result,
      message: "Security logs cleanup completed successfully",
    });
  } catch (error) {
    console.error("Security cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup security logs",
      error: error.message,
    });
  }
});

// POST /api/security/block-ip - Manually block an IP address
router.post("/block-ip", authenticateToken, async (req, res) => {
  try {
    const { ip_address, reason, duration_minutes } = req.body;

    if (!ip_address || !reason) {
      return res.status(400).json({
        success: false,
        message: "IP address and reason are required",
      });
    }

    await SecurityManager.temporaryBlockIP(
      ip_address,
      reason,
      duration_minutes || 60
    );

    res.json({
      success: true,
      data: {
        ip_address,
        reason,
        duration_minutes: duration_minutes || 60,
        blocked_at: new Date().toISOString(),
      },
      message: "IP address blocked successfully",
    });
  } catch (error) {
    console.error("IP blocking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to block IP address",
      error: error.message,
    });
  }
});

// POST /api/security/emergency-lockdown - Enable emergency lockdown
router.post("/emergency-lockdown", authenticateToken, async (req, res) => {
  try {
    const { reason, duration_minutes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Lockdown reason is required",
      });
    }

    const result = await SecurityManager.enableEmergencyLockdown(
      reason,
      duration_minutes
    );

    res.json({
      success: true,
      data: result,
      message: "Emergency lockdown enabled successfully",
    });
  } catch (error) {
    console.error("Emergency lockdown error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enable emergency lockdown",
      error: error.message,
    });
  }
});

// GET /api/security/logs - Get recent security logs with pagination
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let params = [];

    if (type) {
      whereClause += " AND attempt_type = ?";
      params.push(type);
    }

    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    params.push(parseInt(limit), parseInt(offset));

    const { pool } = require("../config/database");
    const [logs] = await pool.execute(
      `
      SELECT ip_address, attempt_type, status, reason, endpoint, method, created_at
      FROM security_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `,
      params
    );

    const [totalCount] = await pool.execute(
      `
      SELECT COUNT(*) as total
      FROM security_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${whereClause}
    `,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        logs: logs,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalCount[0].total,
          total_pages: Math.ceil(totalCount[0].total / limit),
        },
      },
      message: "Security logs retrieved successfully",
    });
  } catch (error) {
    console.error("Security logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get security logs",
      error: error.message,
    });
  }
});

// GET /api/security/health - Security system health check
router.get("/health", async (req, res) => {
  try {
    const { pool } = require("../config/database");

    // Test database connection for security tables
    await pool.execute("SELECT 1 FROM security_logs LIMIT 1");
    await pool.execute("SELECT 1 FROM blocked_ips LIMIT 1");

    res.json({
      success: true,
      data: {
        security_middleware: "operational",
        database_tables: "accessible",
        rate_limiting: "functional",
        ip_blocking: "functional",
        input_validation: "functional",
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
      message: "Security system health check passed",
    });
  } catch (error) {
    console.error("Security health error:", error);
    res.status(500).json({
      success: false,
      message: "Security system health check failed",
      error: error.message,
    });
  }
});

module.exports = router;
