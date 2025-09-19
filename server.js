// UPDATED: server.js
// Simple School Template Server - Single Tenant System

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database
const { testConnection } = require("./src/config/database");

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create upload directories if they don't exist
const uploadDirs = ["uploads/spmb", "uploads/logos"];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================

// GET /api/health - Server health check
app.get("/api/health", async (req, res) => {
  try {
    const dbConnected = await testConnection();

    res.json({
      success: true,
      message: "SPMB Template System is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: dbConnected ? "connected" : "disconnected",
      version: "1.0.0",
      features: [
        "SPMB Online Registration",
        "Admin Panel Management",
        "Configurable Jurusan & Payment",
        "PDF Bukti Generation",
        "School Branding Support",
        "File Upload System",
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/health/database - Database specific health check
app.get("/api/health/database", async (req, res) => {
  try {
    const isConnected = await testConnection();

    if (isConnected) {
      // Test basic table existence
      const { pool } = require("./src/config/database");
      const [tables] = await pool.execute("SHOW TABLES");
      const tableNames = tables.map((row) => Object.values(row)[0]);

      const requiredTables = [
        "school_info",
        "admin_users",
        "jurusan",
        "payment_options",
        "pendaftar_spmb",
      ];

      const missingTables = requiredTables.filter(
        (table) => !tableNames.includes(table)
      );

      res.json({
        success: true,
        message: "Database connection successful",
        timestamp: new Date().toISOString(),
        database_info: {
          connected: true,
          total_tables: tableNames.length,
          required_tables: requiredTables.length,
          missing_tables: missingTables,
          status: missingTables.length === 0 ? "ready" : "incomplete",
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database health check error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/health/system - System information
app.get("/api/health/system", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    message: "System information",
    data: {
      status: "running",
      uptime: `${Math.floor(uptime)} seconds`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        percentage: `${Math.round(
          (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        )}%`,
      },
      nodejs_version: process.version,
      platform: process.platform,
      pid: process.pid,
      architecture: process.arch,
    },
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// API ROUTES - SIMPLE TEMPLATE SYSTEM
// =============================================================================

// Public SPMB routes (no authentication required)
app.use("/api/spmb", require("./src/routes/spmb"));

// Admin management routes (authentication required)
app.use("/api/admin", require("./src/routes/admin"));

// Legacy auth route for backward compatibility
app.use("/api/auth", require("./src/routes/auth"));

// =============================================================================
// API DOCUMENTATION ENDPOINT
// =============================================================================

app.get("/api/docs", async (req, res) => {
  try {
    // Get system status
    const dbConnected = await testConnection();

    res.json({
      success: true,
      message: "SPMB Template System API Documentation",
      version: "1.0.0",
      system_type: "Single-Tenant School Template",
      business_model: "One-time purchase per school",

      features: {
        "Fixed Form Structure":
          "SPMB form based on provided design (Images 1-3)",
        "Admin Configuration": "Manage jurusan and payment options",
        "School Branding": "Customizable logo, colors, and school info",
        "File Upload System": "PDF documents and images with validation",
        "PDF Bukti Generation": "Branded registration certificates",
        "Status Management": "Track and update student applications",
      },

      system_status: {
        database: dbConnected ? "connected" : "disconnected",
        upload_directories: "configured",
        api_endpoints: "operational",
      },

      endpoints: {
        // Public endpoints
        "GET /api/health": "System health check",
        "GET /api/health/database": "Database health check",
        "GET /api/health/system": "System information",
        "GET /api/docs": "This documentation",

        // SPMB Public endpoints
        "GET /api/spmb/school-info": "Get public school information",
        "GET /api/spmb/form-config":
          "Get form configuration (jurusan + payment options)",
        "POST /api/spmb/register":
          "Submit student registration (with file uploads)",
        "GET /api/spmb/check-status/:no_pendaftaran/:pin":
          "Check registration status",
        "GET /api/spmb/bukti/:no_pendaftaran": "Generate PDF bukti pendaftaran",

        // Admin endpoints (require authentication)
        "POST /api/admin/login": "Admin login",
        "GET /api/admin/profile": "Get admin profile",
        "GET /api/admin/school-info": "Get school configuration",
        "PUT /api/admin/school-info":
          "Update school configuration (with logo upload)",
        "GET /api/admin/jurusan": "Get all jurusan",
        "POST /api/admin/jurusan": "Create new jurusan",
        "PUT /api/admin/jurusan/:id": "Update jurusan",
        "DELETE /api/admin/jurusan/:id": "Delete jurusan",
        "GET /api/admin/payment-options": "Get all payment options",
        "POST /api/admin/payment-options": "Create new payment option",
        "PUT /api/admin/payment-options/:id": "Update payment option",
        "GET /api/admin/students": "Get students (with pagination and search)",
        "PUT /api/admin/students/:id/status": "Update student status",
        "GET /api/admin/dashboard-stats": "Get dashboard statistics",
      },

      authentication: {
        "Admin Auth": "JWT token via POST /api/admin/login",
        "Token Header": "Authorization: Bearer {token}",
        "Default Admin": {
          username: "admin",
          password: "admin123",
          note: "Change this in production!",
        },
      },

      database_schema: {
        school_info: "School configuration and branding",
        admin_users: "Admin user management",
        jurusan: "Configurable programs/majors",
        payment_options: "Configurable payment plans",
        pendaftar_spmb: "Student registrations (fixed structure)",
      },

      file_uploads: {
        "Student Documents": [
          "bukti_pembayaran (PDF, required)",
          "akta_kelahiran (PDF, required)",
          "kartu_keluarga (PDF, required)",
          "pas_foto (JPG/PNG, required)",
          "ijazah (PDF, optional)",
          "surat_keterangan_lulus (PDF, optional)",
        ],
        "School Branding": ["school_logo (JPG/PNG, via admin panel)"],
        "Upload Limits": "5MB per file",
        "Storage Location": "/uploads/",
      },

      customization: {
        "School Information": "Name, address, contact info",
        Branding: "Logo, primary color, secondary color",
        "Jurusan/Programs": "Fully configurable via admin panel",
        "Payment Options": "Fully configurable via admin panel",
        "Registration Settings":
          "Open/closed status, date ranges, student limits",
      },

      deployment: {
        Requirements: "Node.js 16+, MySQL 8+, 2GB RAM minimum",
        Installation:
          "Clone → npm install → configure .env → run SQL schema → npm start",
        "White-labeling": "Customize school_info table and logo upload",
        Backup: "Regular MySQL backup recommended",
        Updates: "Template updates via code replacement",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate documentation",
      error: error.message,
    });
  }
});

// =============================================================================
// SETUP WIZARD ENDPOINT
// =============================================================================

app.get("/api/setup/status", async (req, res) => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      return res.json({
        success: true,
        setup_required: true,
        current_step: "database_connection",
        message: "Database connection required",
      });
    }

    const { pool } = require("./src/config/database");

    // Check if tables exist
    try {
      const [schoolInfo] = await pool.execute(
        "SELECT COUNT(*) as count FROM school_info"
      );
      const [adminUsers] = await pool.execute(
        "SELECT COUNT(*) as count FROM admin_users"
      );

      if (schoolInfo[0].count === 0) {
        return res.json({
          success: true,
          setup_required: true,
          current_step: "school_configuration",
          message: "School information setup required",
        });
      }

      if (adminUsers[0].count === 0) {
        return res.json({
          success: true,
          setup_required: true,
          current_step: "admin_creation",
          message: "Admin user creation required",
        });
      }

      res.json({
        success: true,
        setup_required: false,
        current_step: "complete",
        message: "System ready for use",
      });
    } catch (error) {
      res.json({
        success: true,
        setup_required: true,
        current_step: "database_schema",
        message: "Database schema setup required",
        error: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Setup status check failed",
      error: error.message,
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Custom 404 middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.originalUrl}`,
      error: "Endpoint does not exist",
      available_endpoints: [
        "GET /api/health - System health",
        "GET /api/docs - API documentation",
        "GET /api/spmb/form-config - Public form configuration",
        "POST /api/spmb/register - Student registration",
        "POST /api/admin/login - Admin authentication",
      ],
      suggestion: "Check /api/docs for complete endpoint list",
      timestamp: new Date().toISOString(),
    });
  }

  // For non-API routes, serve a simple message
  res.status(404).json({
    success: false,
    message: "Route not found",
    requested_url: req.originalUrl,
    suggestion: "Check API documentation at /api/docs",
    system: "SPMB Template System",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("=== GLOBAL ERROR ===");
  console.error("URL:", req.originalUrl);
  console.error("Method:", req.method);
  console.error("Error:", error);
  console.error("Stack:", error.stack);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
    request_id: req.id || Date.now(),
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startServer = async () => {
  try {
    console.log("=====================================");
    console.log("🏫 SPMB TEMPLATE SYSTEM STARTING...");
    console.log("=====================================");

    // Test database connection
    console.log("🔍 Testing database connection...");
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error("❌ Database connection failed!");
      console.error("📋 Please check your database configuration in .env file");
      console.error("📋 Ensure MySQL is running and credentials are correct");
      process.exit(1);
    }

    console.log("✅ Database connection successful");

    // Check upload directories
    console.log("📁 Checking upload directories...");
    uploadDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        console.log(`✅ Directory exists: ${dir}`);
      } else {
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // Start HTTP server
    app.listen(PORT, () => {
      console.log("=====================================");
      console.log("🚀 SERVER STARTED SUCCESSFULLY!");
      console.log("=====================================");
      console.log(`📡 Server URL: http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(
        `📊 Database Check: http://localhost:${PORT}/api/health/database`
      );
      console.log(`⚙️ Setup Status: http://localhost:${PORT}/api/setup/status`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=====================================");
      console.log("🎯 SIMPLE TEMPLATE SYSTEM FEATURES:");
      console.log("✅ Fixed SPMB form structure");
      console.log("✅ Admin panel for configuration");
      console.log("✅ School branding support");
      console.log("✅ PDF bukti generation");
      console.log("✅ File upload system");
      console.log("✅ Student management");
      console.log("=====================================");
      console.log("📖 Quick Start:");
      console.log("1. Visit /api/docs for complete API documentation");
      console.log("2. Use /api/setup/status to check system readiness");
      console.log("3. Login to admin panel: POST /api/admin/login");
      console.log("4. Configure school info and options");
      console.log("5. Test registration: GET /api/spmb/form-config");
      console.log("=====================================");
      console.log("🔥 System ready to accept connections!");
    });
  } catch (error) {
    console.error("❌ Failed to start server:");
    console.error(error);
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();
