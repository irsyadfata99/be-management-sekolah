const express = require("express");
const router = express.Router();
const { getDatabaseInfo } = require("../config/database");
const os = require("os");

// Health check for server
router.get("/server", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    message: "Server is running",
    data: {
      status: "healthy",
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
      node_version: process.version,
      platform: os.platform(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// Health check for database
router.get("/database", async (req, res) => {
  try {
    const dbInfo = await getDatabaseInfo();

    if (dbInfo.connected) {
      res.json({
        success: true,
        message: "Database connected successfully",
        data: dbInfo,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Database connection failed",
        data: dbInfo,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database health check failed",
      error: error.message,
    });
  }
});

// Combined health check
router.get("/", async (req, res) => {
  try {
    const dbInfo = await getDatabaseInfo();
    const uptime = process.uptime();

    res.json({
      success: true,
      message: "System health check",
      data: {
        server: {
          status: "healthy",
          uptime: `${Math.floor(uptime / 60)} minutes`,
          environment: process.env.NODE_ENV,
        },
        database: {
          status: dbInfo.connected ? "connected" : "disconnected",
          tables: dbInfo.tablesCount || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
});

module.exports = router;
