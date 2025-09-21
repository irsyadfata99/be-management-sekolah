// UPDATED: server.js
// Complete School Template Server with Auto Database Initialization

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Keep existing imports as requested
const SecurityManager = require("./src/middleware/security");
const databaseOptimization = require("./src/services/databaseOptimization");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database and initializer
const { testConnection } = require("./src/config/database");
const DatabaseInitializer = require("./src/config/databaseInit");

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create upload directories if they don't exist
const uploadDirs = [
  "uploads/spmb",
  "uploads/logos",
  "uploads/articles",
  "uploads/school",
  "uploads/temp",
  "uploads/personnel",
  "uploads/public-docs",
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

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
        "Content Management System",
        "Academic Calendar",
        "Email Notifications",
        "Excel Export System",
        "PDF Generation",
        "School Branding Support",
        "File Upload System",
        "Public Articles API",
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

// GET /api/health/database - Database specific health check with auto-init
app.get("/api/health/database", async (req, res) => {
  try {
    const isConnected = await testConnection();

    if (isConnected) {
      // Get database health from our initializer
      const healthCheck = await DatabaseInitializer.checkDatabaseHealth();
      const { pool } = require("./src/config/database");
      const [tables] = await pool.execute("SHOW TABLES");
      const tableNames = tables.map((row) => Object.values(row)[0]);

      const requiredTables = [
        "admin_users",
        "jurusan",
        "payment_options",
        "pendaftar_spmb",
        "artikel",
        "kategori_artikel",
        "school_settings",
        "academic_calendar",
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
          table_health: healthCheck,
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
// API ROUTES - COMPLETE SYSTEM
// =============================================================================

app.use("/api/spmb", require("./src/routes/spmb"));
app.use("/api/admin", require("./src/routes/admin"));
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/settings", require("./src/routes/settings"));
app.use("/api/email", require("./src/routes/email"));
app.use("/api/export", require("./src/routes/export"));
app.use("/api/calendar", require("./src/routes/calendar"));
app.use("/api/security", require("./src/routes/security"));
app.use("/api/optimization", require("./src/routes/optimization"));

// PUBLIC ROUTES (no authentication required)
app.use("/api/public/articles", require("./src/routes/public/articles"));
app.use("/api/public/documents", require("./src/routes/public/documents"));

// Admin sub-routes
app.use("/api/admin/documents", require("./src/routes/admin/documents"));
app.use("/api/admin/articles", require("./src/routes/admin/articles"));
app.use("/api/admin/categories", require("./src/routes/admin/categories"));
app.use("/api/admin/personnel", require("./src/routes/admin/personnel"));

// GET /api/docs - Complete API documentation
app.get("/api/docs", async (req, res) => {
  try {
    const dbConnected = await testConnection();

    res.json({
      success: true,
      message: "Complete SPMB Template System API Documentation",
      version: "2.0.0",
      system_type: "Full-Stack School Management System",
      business_model: "Complete school website solution",

      features: {
        "SPMB Registration": "Complete online student registration system",
        "Admin Management": "Full admin panel with role-based access",
        "Content Management": "Article and category management with public API",
        "Academic Calendar": "Event management with iCal export",
        "Email System": "Automated notifications with templates",
        "Excel Export": "Professional data export with filtering",
        "PDF Generation": "Branded registration certificates",
        "File Management": "Secure upload and download system",
        "Public API": "Frontend-ready article endpoints",
        "Database Auto-Init": "Self-configuring database setup",
      },

      system_status: {
        database: dbConnected ? "connected" : "disconnected",
        upload_directories: "configured",
        api_endpoints: "operational",
        auto_initialization: "enabled",
      },

      endpoints: {
        // Health & System
        "GET /api/health": "System health check",
        "GET /api/health/database": "Database health with auto-init",
        "GET /api/health/system": "System information",
        "GET /api/docs": "This documentation",

        // Public SPMB
        "GET /api/spmb/school-info": "Get public school information",
        "GET /api/spmb/form-config": "Get form configuration",
        "POST /api/spmb/register": "Submit student registration",
        "GET /api/spmb/check-status/:no/:pin": "Check registration status",
        "GET /api/spmb/bukti/:no": "Generate PDF certificate",
        "GET /api/spmb/download-pdf/:id": "Download PDF certificate",

        // Public Articles API
        "GET /api/public/articles": "List published articles",
        "GET /api/public/articles/:slug": "Get single article",
        "GET /api/public/categories": "List active categories",
        "GET /api/public/categories/:slug": "Get category with articles",
        "GET /api/public/articles/search": "Search articles",
        "GET /api/public/articles/featured": "Get featured articles",
        "GET /api/public/articles/recent": "Get recent articles",
        "GET /api/public/articles/stats": "Get article statistics",

        // Authentication
        "POST /api/auth/login": "Admin login",
        "GET /api/auth/profile": "Get admin profile",
        "POST /api/auth/logout": "Admin logout",

        // Admin - Student Management
        "GET /api/admin/students": "List students with filters",
        "PUT /api/admin/students/:id/status": "Update student status",
        "GET /api/admin/dashboard-stats": "Dashboard statistics",

        // Admin - School Configuration
        "GET /api/admin/school-info": "Get school configuration",
        "PUT /api/admin/school-info": "Update school configuration",
        "GET /api/admin/jurusan": "Manage programs/majors",
        "GET /api/admin/payment-options": "Manage payment options",

        // Admin - Content Management
        "GET /api/admin/articles": "Manage articles",
        "POST /api/admin/articles": "Create article",
        "PUT /api/admin/articles/:id": "Update article",
        "DELETE /api/admin/articles/:id": "Delete article",
        "GET /api/admin/categories": "Manage categories",
        "POST /api/admin/categories": "Create category",

        // Settings & Configuration
        "GET /api/settings": "Get school settings",
        "PUT /api/settings": "Update school settings",
        "POST /api/settings/logo": "Upload school logo",
        "GET /api/settings/system-info": "System information",

        // Email System
        "GET /api/email/health": "Email service health check",
        "POST /api/email/test-send": "Send test email",
        "GET /api/email/config-status": "Email configuration status",

        // Export System
        "GET /api/export/registrations": "Export SPMB data to Excel",
        "GET /api/export/summary": "Export summary report",
        "GET /api/export/template": "Download import template",
        "GET /api/export/stats": "Export statistics",

        // Academic Calendar
        "GET /api/calendar": "Get calendar events",
        "POST /api/calendar": "Create calendar event",
        "PUT /api/calendar/:id": "Update calendar event",
        "DELETE /api/calendar/:id": "Delete calendar event",
        "GET /api/calendar/public/events": "Public calendar events",
        "GET /api/calendar/export": "Export calendar (JSON/iCal)",
      },

      authentication: {
        Method: "JWT Bearer Token",
        Header: "Authorization: Bearer {token}",
        "Default Admin": {
          username: "admin",
          password: "admin123",
          note: "Auto-created on first run",
        },
      },

      database_schema: {
        admin_users: "Admin user management with permissions",
        pendaftar_spmb: "Student registrations with files",
        jurusan: "Configurable programs/majors",
        payment_options: "Configurable payment plans",
        artikel: "Article content management",
        kategori_artikel: "Article categories",
        school_settings: "School configuration",
        academic_calendar: "Calendar events",
        email_templates: "Email template management",
      },

      file_uploads: {
        "SPMB Documents": [
          "bukti_pembayaran (PDF, required)",
          "akta_kelahiran (PDF, required)",
          "kartu_keluarga (PDF, required)",
          "pas_foto (JPG/PNG, required)",
          "ijazah (PDF, optional)",
          "surat_keterangan_lulus (PDF, optional)",
        ],
        "Content Images": ["article images (JPG/PNG, 2MB max)"],
        "School Assets": ["school logo (JPG/PNG, 1MB max)"],
        "Upload Limits": "5MB per SPMB file, 2MB per image",
        Storage: "/uploads/ with organized subfolders",
      },

      auto_initialization: {
        "Database Setup": "Automatic table creation on first run",
        "Default Data": "Sample admin, categories, and settings",
        "Health Monitoring": "Continuous database health checks",
        "Migration Safe": "Won't overwrite existing data",
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
// SETUP WIZARD ENDPOINT - Enhanced with Auto-Init
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
        auto_init_available: true,
      });
    }

    // Check database health
    const healthCheck = await DatabaseInitializer.checkDatabaseHealth();
    const missingTables = Object.entries(healthCheck)
      .filter(([table, status]) => !status.exists)
      .map(([table, status]) => table);

    if (missingTables.length > 0) {
      return res.json({
        success: true,
        setup_required: true,
        current_step: "database_initialization",
        message: `Missing tables: ${missingTables.join(", ")}`,
        missing_tables: missingTables,
        auto_init_available: true,
        suggestion: "Restart server to trigger auto-initialization",
      });
    }

    const { pool } = require("./src/config/database");

    try {
      const [schoolSettings] = await pool.execute(
        "SELECT COUNT(*) as count FROM school_settings"
      );
      const [adminUsers] = await pool.execute(
        "SELECT COUNT(*) as count FROM admin_users"
      );

      if (schoolSettings[0].count === 0) {
        return res.json({
          success: true,
          setup_required: true,
          current_step: "school_configuration",
          message: "School settings setup required",
          auto_init_available: true,
        });
      }

      if (adminUsers[0].count === 0) {
        return res.json({
          success: true,
          setup_required: true,
          current_step: "admin_creation",
          message: "Admin user creation required",
          auto_init_available: true,
        });
      }

      res.json({
        success: true,
        setup_required: false,
        current_step: "complete",
        message: "System fully initialized and ready",
        database_health: healthCheck,
      });
    } catch (error) {
      res.json({
        success: true,
        setup_required: true,
        current_step: "database_schema",
        message: "Database schema setup required",
        error: error.message,
        auto_init_available: true,
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

// POST /api/setup/init - Manual database initialization trigger
app.post("/api/setup/init", async (req, res) => {
  try {
    console.log("Manual database initialization triggered...");
    const initSuccess = await DatabaseInitializer.initializeDatabase();

    if (initSuccess) {
      const healthCheck = await DatabaseInitializer.checkDatabaseHealth();
      res.json({
        success: true,
        message: "Database initialization completed successfully",
        database_health: healthCheck,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Database initialization failed",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database initialization error",
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
        "GET /api/docs - Complete API documentation",
        "GET /api/public/articles - Public articles",
        "GET /api/spmb/form-config - SPMB configuration",
        "POST /api/spmb/register - Student registration",
        "POST /api/auth/login - Admin authentication",
      ],
      suggestion: "Check /api/docs for complete endpoint list",
      timestamp: new Date().toISOString(),
    });
  }

  res.status(404).json({
    success: false,
    message: "Route not found",
    requested_url: req.originalUrl,
    suggestion: "Check API documentation at /api/docs",
    system: "Complete SPMB Management System",
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
// SERVER STARTUP WITH AUTO DATABASE INITIALIZATION
// =============================================================================

const startServer = async () => {
  try {
    console.log("=====================================");
    console.log("🏫 COMPLETE SPMB SYSTEM STARTING...");
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

    // Initialize database tables and data
    console.log("🔧 Initializing database structure...");
    const initSuccess = await DatabaseInitializer.initializeDatabase();

    if (!initSuccess) {
      console.warn("⚠️  Database initialization had issues, but continuing...");
      console.log("💡 You can manually trigger init at POST /api/setup/init");
    }

    // Check database health
    console.log("🏥 Performing database health check...");
    const healthCheck = await DatabaseInitializer.checkDatabaseHealth();
    console.log("📊 Database Health Summary:");
    Object.entries(healthCheck).forEach(([table, status]) => {
      if (status.exists) {
        console.log(`   ✅ ${table}: ${status.count} records`);
      } else {
        console.log(`   ⚠️  ${table}: ${status.error}`);
      }
    });

    // Check upload directories
    console.log("📁 Verifying upload directories...");
    uploadDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        console.log(`   ✅ ${dir}`);
      } else {
        console.log(`   📁 Created: ${dir}`);
      }
    });

    // Initialize security and optimization (keeping as requested)
    try {
      if (SecurityManager && typeof SecurityManager.initialize === "function") {
        console.log("🔒 Initializing security manager...");
        await SecurityManager.initialize();
        console.log("✅ Security manager initialized");
      }
    } catch (error) {
      console.warn(
        "⚠️  Security manager initialization skipped:",
        error.message
      );
    }

    try {
      if (
        databaseOptimization &&
        typeof databaseOptimization.optimize === "function"
      ) {
        console.log("⚡ Running database optimization...");
        await databaseOptimization.optimize();
        console.log("✅ Database optimization completed");
      }
    } catch (error) {
      console.warn("⚠️  Database optimization skipped:", error.message);
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log("=====================================");
      console.log("🚀 SERVER STARTED SUCCESSFULLY!");
      console.log("=====================================");
      console.log(`📡 Server URL: http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(
        `🗄️  Database Health: http://localhost:${PORT}/api/health/database`
      );
      console.log(
        `⚙️  Setup Status: http://localhost:${PORT}/api/setup/status`
      );
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=====================================");
      console.log("🎯 COMPLETE FEATURES AVAILABLE:");
      console.log("✅ SPMB Registration System");
      console.log("✅ Admin Management Panel");
      console.log("✅ Content Management (Articles)");
      console.log("✅ Academic Calendar");
      console.log("✅ Email Notification System");
      console.log("✅ Excel Export System");
      console.log("✅ PDF Generation");
      console.log("✅ Public Articles API");
      console.log("✅ File Upload & Management");
      console.log("✅ Auto Database Initialization");
      console.log("=====================================");
      console.log("📖 Quick Start Guide:");
      console.log("1. Visit /api/docs for complete API documentation");
      console.log("2. Check /api/setup/status for system readiness");
      console.log("3. Login: POST /api/auth/login (admin/admin123)");
      console.log("4. Test public API: GET /api/public/articles");
      console.log("5. Admin panel: Access all /api/admin/* endpoints");
      console.log("=====================================");
      console.log("🔥 SYSTEM FULLY OPERATIONAL!");
      console.log("Ready for frontend integration and production use");
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
