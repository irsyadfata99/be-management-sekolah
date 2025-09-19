// src/routes/optimization.js - Database Optimization Routes
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const DatabaseOptimization = require("../services/databaseOptimization");

// GET /api/optimization/status - Get optimization status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        optimization_service: "active",
        indexes_created: "completed",
        query_monitoring: "active",
        cleanup_scheduled: "active",
        performance_views: "created",
        connection_pool: "optimized",
        timestamp: new Date().toISOString(),
      },
      message: "Database optimization status retrieved successfully",
    });
  } catch (error) {
    console.error("Optimization status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get optimization status",
      error: error.message,
    });
  }
});

// GET /api/optimization/health - Database health metrics
router.get("/health", authenticateToken, async (req, res) => {
  try {
    const healthData = await DatabaseOptimization.getDatabaseHealth();

    res.json({
      success: true,
      data: healthData,
      message: "Database health metrics retrieved successfully",
    });
  } catch (error) {
    console.error("Database health error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get database health metrics",
      error: error.message,
    });
  }
});

// GET /api/optimization/table-analysis - Analyze table sizes and performance
router.get("/table-analysis", authenticateToken, async (req, res) => {
  try {
    const analysis = await DatabaseOptimization.analyzeTableSizes();

    res.json({
      success: true,
      data: analysis,
      message: "Table analysis completed successfully",
    });
  } catch (error) {
    console.error("Table analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze tables",
      error: error.message,
    });
  }
});

// POST /api/optimization/optimize-table - Optimize specific table
router.post("/optimize-table", authenticateToken, async (req, res) => {
  try {
    const { table_name } = req.body;

    if (!table_name) {
      return res.status(400).json({
        success: false,
        message: "Table name is required",
      });
    }

    // Validate table name to prevent SQL injection
    const allowedTables = [
      "pendaftar_spmb",
      "admin_users",
      "jurusan",
      "payment_options",
      "articles",
      "guru_staff",
      "email_logs",
      "academic_calendar",
      "school_settings",
    ];

    if (!allowedTables.includes(table_name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table name",
      });
    }

    const result = await DatabaseOptimization.optimizeTable(table_name);

    res.json({
      success: true,
      data: result,
      message: `Table ${table_name} optimized successfully`,
    });
  } catch (error) {
    console.error("Table optimization error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to optimize table",
      error: error.message,
    });
  }
});

// POST /api/optimization/cleanup - Clean up old data
router.post("/cleanup", authenticateToken, async (req, res) => {
  try {
    const cleanupResults = await DatabaseOptimization.cleanupOldData();

    res.json({
      success: true,
      data: cleanupResults,
      message: "Data cleanup completed successfully",
    });
  } catch (error) {
    console.error("Data cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup old data",
      error: error.message,
    });
  }
});

// GET /api/optimization/query-stats - Get query performance statistics
router.get("/query-stats", authenticateToken, async (req, res) => {
  try {
    const stats = DatabaseOptimization.getQueryStats();

    res.json({
      success: true,
      data: {
        query_statistics: stats,
        total_queries: Object.keys(stats).length,
        generated_at: new Date().toISOString(),
      },
      message: "Query statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Query stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get query statistics",
      error: error.message,
    });
  }
});

// POST /api/optimization/backup-critical - Backup critical tables
router.post("/backup-critical", authenticateToken, async (req, res) => {
  try {
    const backupResults = await DatabaseOptimization.backupCriticalTables();

    res.json({
      success: true,
      data: backupResults,
      message: "Critical tables backup completed successfully",
    });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to backup critical tables",
      error: error.message,
    });
  }
});

// GET /api/optimization/performance-views - Get data from performance views
router.get("/performance-views", authenticateToken, async (req, res) => {
  try {
    const { pool } = require("../config/database");

    // Get registration statistics
    const [registrationStats] = await pool.execute(`
      SELECT * FROM v_registration_stats 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY date DESC
      LIMIT 100
    `);

    // Get email performance
    const [emailPerformance] = await pool.execute(`
      SELECT * FROM v_email_performance 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY date DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: {
        registration_statistics: registrationStats,
        email_performance: emailPerformance,
        generated_at: new Date().toISOString(),
      },
      message: "Performance views data retrieved successfully",
    });
  } catch (error) {
    console.error("Performance views error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get performance views data",
      error: error.message,
    });
  }
});

// POST /api/optimization/monitor-query - Monitor specific query performance
router.post("/monitor-query", authenticateToken, async (req, res) => {
  try {
    const { query_name, sql_query } = req.body;

    if (!query_name || !sql_query) {
      return res.status(400).json({
        success: false,
        message: "Query name and SQL query are required",
      });
    }

    // Only allow SELECT queries for security
    if (!sql_query.trim().toLowerCase().startsWith("select")) {
      return res.status(400).json({
        success: false,
        message: "Only SELECT queries are allowed",
      });
    }

    const { pool } = require("../config/database");

    const result = await DatabaseOptimization.monitorQuery(
      query_name,
      async () => {
        const [queryResult] = await pool.execute(sql_query);
        return queryResult;
      }
    );

    res.json({
      success: true,
      data: {
        query_name: query_name,
        result_count: result.length,
        execution_tracked: true,
        timestamp: new Date().toISOString(),
      },
      message: "Query executed and performance monitored successfully",
    });
  } catch (error) {
    console.error("Query monitoring error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to monitor query",
      error: error.message,
    });
  }
});

// GET /api/optimization/recommendations - Get optimization recommendations
router.get("/recommendations", authenticateToken, async (req, res) => {
  try {
    const analysis = await DatabaseOptimization.analyzeTableSizes();
    const stats = DatabaseOptimization.getQueryStats();

    const recommendations = [];

    // Check for slow queries
    Object.entries(stats).forEach(([queryName, data]) => {
      if (data.slowQueryPercentage > 10) {
        recommendations.push({
          type: "performance",
          priority: "high",
          title: `Slow Query Detected: ${queryName}`,
          description: `${data.slowQueryPercentage.toFixed(
            1
          )}% of queries are slow`,
          suggestion: "Consider adding indexes or optimizing the query",
        });
      }
    });

    // Add table-specific recommendations from analysis
    if (analysis.recommendations) {
      recommendations.push(
        ...analysis.recommendations.map((rec) => ({
          type: "storage",
          priority: rec.type === "large_table" ? "medium" : "low",
          title: rec.message,
          suggestion:
            rec.type === "large_table"
              ? "Consider archiving old data or partitioning"
              : "Review index usage and necessity",
        }))
      );
    }

    res.json({
      success: true,
      data: {
        recommendations: recommendations,
        total_recommendations: recommendations.length,
        generated_at: new Date().toISOString(),
      },
      message: "Optimization recommendations generated successfully",
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate recommendations",
      error: error.message,
    });
  }
});

module.exports = router;
