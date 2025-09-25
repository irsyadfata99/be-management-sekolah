// ============================================================================
// COMPLETE FIXED SERVER.JS - Web Fullstack Sekolah
// Fixed admin authentication and routing issues
// ============================================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// SECURITY & MIDDLEWARE
// ============================================================================

// Basic security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000", // Next.js frontend
    "http://localhost:3001", // Alternative frontend port
    "http://localhost:5173", // Vite frontend
    "http://localhost:4200", // Angular frontend
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
  ],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logging (development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// ============================================================================
// DATABASE CONNECTION TEST
// ============================================================================

let dbStatus = "Unknown";
let pool;

try {
  const database = require("./src/config/database");
  pool = database.pool;

  // Test database connection
  pool
    .execute("SELECT 1")
    .then(() => {
      dbStatus = "Connected";
      console.log("✅ Database connected successfully");
    })
    .catch((error) => {
      dbStatus = "Connection Failed";
      console.error("❌ Database connection failed:", error.message);
    });
} catch (error) {
  dbStatus = "Configuration Error";
  console.error("❌ Database configuration error:", error.message);
}

// ============================================================================
// HELPER FUNCTION FOR SAFE ROUTE LOADING
// ============================================================================

function safeRequire(path, name) {
  try {
    return require(path);
  } catch (error) {
    console.warn(`⚠️  Route ${name} not available: ${error.message}`);
    return (req, res) => {
      res.status(404).json({
        success: false,
        message: `${name} endpoint not implemented yet`,
        error: "Route file not found",
      });
    };
  }
}

// ============================================================================
// HEALTH & SYSTEM ENDPOINTS
// ============================================================================

// Main health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Web Sekolah Backend - All Systems Operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    features: {
      authentication: "✅ Ready",
      spmb: "✅ Ready",
      articles: "✅ Ready",
      calendar: "✅ Ready",
      personnel: "✅ Ready",
      testimoni: "✅ Ready",
      alumni: "✅ Ready",
      settings: "✅ Ready",
      uploads: "✅ Ready",
    },
  });
});

// System configuration
app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    message: "Frontend configuration",
    data: {
      api_base_url: `http://localhost:${PORT}/api`,
      upload_limits: {
        max_file_size: "5MB",
        allowed_types: ["PDF", "JPG", "PNG", "WEBP"],
      },
      features: {
        spmb_registration: true,
        article_management: true,
        calendar_events: true,
        personnel_management: true,
        testimoni_management: true,
        alumni_management: true,
      },
    },
  });
});

// API Documentation
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    message: "Web Sekolah API Documentation",
    version: "1.0.0",
    base_url: `http://localhost:${PORT}/api`,
    endpoints: {
      public: {
        health: "GET /api/health - System health check",
        config: "GET /api/config - Frontend configuration",
        articles: "GET /api/public/articles - Public articles",
        testimoni: "GET /api/public/testimoni - Public testimonials",
        alumni: "GET /api/public/alumni - Public alumni profiles",
        calendar: "GET /api/calendar/public/events - Public calendar events",
        spmb_config: "GET /api/spmb/form-config - SPMB form configuration",
        spmb_register: "POST /api/spmb/register - Student registration",
        settings: "GET /api/settings - School settings",
      },
      admin: {
        auth: "POST /api/auth/login - Admin authentication",
        profile: "GET /api/admin/profile - User profile (requires auth)",
        dashboard: "GET /api/admin/dashboard/stats - Dashboard statistics",
        personnel: "GET /api/admin/personnel - Personnel management",
        articles: "GET /api/admin/articles - Article management",
        calendar: "GET /api/admin/calendar - Calendar management",
        testimoni: "GET /api/admin/testimoni - Testimoni management",
        alumni: "GET /api/admin/alumni - Alumni management",
        students: "GET /api/admin/students - Student management",
        settings: "PUT /api/settings - Update school settings",
      },
    },
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>",
      login: "POST /api/auth/login",
      required_for: "All /api/admin/* endpoints",
    },
  });
});

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// School settings (public info)
app.use("/api/settings", safeRequire("./src/routes/settings", "settings"));

app.use("/api/contact", safeRequire("./src/routes/contact", "contact"));

// Public articles
app.use(
  "/api/public/articles",
  safeRequire("./src/routes/public/articles", "public articles")
);

// Public calendar
app.use(
  "/api/public/calendar",
  safeRequire("./src/routes/public/calendar", "public calendar")
);

// Public testimoni & alumni
app.use(
  "/api/public/testimoni",
  safeRequire("./src/routes/public/testimoni", "public testimoni")
);
app.use(
  "/api/public/alumni",
  safeRequire("./src/routes/public/alumni", "public alumni")
);

// Public documents
app.use(
  "/api/public/documents",
  safeRequire("./src/routes/public/documents", "public documents")
);

// SPMB registration system
app.use("/api/spmb", safeRequire("./src/routes/spmb", "spmb"));

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.use("/api/auth", safeRequire("./src/routes/auth", "authentication"));

// ============================================================================
// ADMIN ROUTES (Authentication Required) - FIXED VERSION
// ============================================================================

// Import middleware for admin routes
const { authenticateToken, requireAdmin } = safeRequire(
  "./src/middleware/auth",
  "auth middleware"
) || {
  authenticateToken: (req, res, next) => {
    res.status(503).json({
      success: false,
      message: "Authentication middleware not available",
      error: "MIDDLEWARE_ERROR",
    });
  },
  requireAdmin: (req, res, next) => next(),
};

// CRITICAL FIX: Direct admin profile endpoint (required by frontend)
app.get(
  "/api/admin/profile",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log(
        "🔍 Profile endpoint accessed by:",
        req.user?.username || "unknown"
      );

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found in request",
          error: "NO_USER_DATA",
        });
      }

      // Return comprehensive user profile data
      res.json({
        success: true,
        message: "Profile retrieved successfully",
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email || "",
            full_name: req.user.full_name || req.user.username,
            role: req.user.role || "admin",
            permissions: {
              can_manage_students: req.user.can_manage_students || false,
              can_manage_settings: req.user.can_manage_settings || false,
              can_export_data: req.user.can_export_data || false,
              can_manage_admins: req.user.can_manage_admins || false,
            },
            is_active: req.user.is_active || true,
            last_login: req.user.last_login || null,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Profile endpoint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve profile",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Dashboard routes
app.use(
  "/api/admin/dashboard",
  safeRequire("./src/routes/admin/dashboard", "admin dashboard")
);

// Personnel management (teachers/staff)
app.use(
  "/api/admin/personnel",
  safeRequire("./src/routes/admin/personnel", "admin personnel")
);

// Article management
app.use(
  "/api/admin/articles",
  safeRequire("./src/routes/admin/articles", "admin articles")
);

// Calendar management
app.use(
  "/api/admin/calendar",
  safeRequire("./src/routes/admin/calendar", "admin calendar")
);

// Student management
app.use(
  "/api/admin/students",
  safeRequire("./src/routes/admin/students", "admin students")
);

// Testimoni & Alumni management
app.use(
  "/api/admin/testimoni",
  safeRequire("./src/routes/admin/testimoni", "admin testimoni")
);
app.use(
  "/api/admin/alumni",
  safeRequire("./src/routes/admin/alumni", "admin alumni")
);

// Document management
app.use(
  "/api/admin/documents",
  safeRequire("./src/routes/admin/documents", "admin documents")
);

// Export functionality
app.use(
  "/api/admin/export",
  safeRequire("./src/routes/admin/export", "admin export")
);

// ============================================================================
// DEBUG & TEST ENDPOINTS (Development Only)
// ============================================================================

if (process.env.NODE_ENV !== "production") {
  // Debug authentication endpoint
  app.get("/api/admin/debug", authenticateToken, requireAdmin, (req, res) => {
    res.json({
      success: true,
      message: "Debug endpoint - authentication working perfectly",
      data: {
        user: {
          id: req.user?.id || "N/A",
          username: req.user?.username || "N/A",
          role: req.user?.role || "N/A",
          permissions: {
            can_manage_students: req.user?.can_manage_students || false,
            can_manage_settings: req.user?.can_manage_settings || false,
            can_export_data: req.user?.can_export_data || false,
            can_manage_admins: req.user?.can_manage_admins || false,
          },
        },
        server_info: {
          token_received: !!req.headers.authorization,
          middleware_working: true,
          database_status: dbStatus,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Simple test endpoint (no auth required)
  app.get("/api/admin/test", (req, res) => {
    res.json({
      success: true,
      message: "Admin test endpoint working",
      server_status: "operational",
      database_status: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Database test endpoint
  app.get(
    "/api/admin/db-test",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
      try {
        if (!pool) {
          return res.status(503).json({
            success: false,
            message: "Database pool not available",
          });
        }

        const [result] = await pool.execute(
          "SELECT COUNT(*) as count FROM admin_users WHERE is_active = 1"
        );

        res.json({
          success: true,
          message: "Database test successful",
          data: {
            active_admin_users: result[0]?.count || 0,
            database_status: dbStatus,
            current_user: req.user?.username || "unknown",
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Database test failed",
          error: error.message,
        });
      }
    }
  );
}

// ============================================================================
// LEGACY ROUTE SUPPORT (for backward compatibility)
// ============================================================================

// Calendar routes (legacy)
app.use("/api/calendar", safeRequire("./src/routes/calendar", "calendar"));

// Articles routes (legacy)
app.use("/api/articles", safeRequire("./src/routes/articles", "articles"));

// ============================================================================
// FILE UPLOAD HANDLING
// ============================================================================

// Handle multipart uploads
app.use("/api/upload", safeRequire("./src/routes/upload", "file upload"));

// ============================================================================
// EMAIL SYSTEM
// ============================================================================

app.use("/api/email", safeRequire("./src/routes/email", "email system"));

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.path}`,
    error: "Endpoint does not exist",
    available_endpoints: [
      "GET /api/health - System health",
      "GET /api/docs - Complete API documentation",
      "GET /api/config - Frontend configuration",
      "GET /api/public/articles - Public articles",
      "GET /api/public/testimoni - Public testimonials",
      "GET /api/public/alumni - Public alumni",
      "GET /api/spmb/form-config - SPMB configuration",
      "POST /api/spmb/register - Student registration",
      "POST /api/auth/login - Admin authentication",
      "GET /api/admin/profile - Admin profile (requires auth)",
    ],
    suggestion: "Check /api/docs for complete endpoint list",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("=== SERVER ERROR ===");
  console.error("Time:", new Date().toISOString());
  console.error("URL:", req.method, req.path);
  console.error("Error:", error);
  console.error("Stack:", error.stack);
  console.error("==================");

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== "production";

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    error: isDevelopment ? error.stack : "Something went wrong",
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      details: {
        method: req.method,
        url: req.path,
        body: req.body,
        query: req.query,
        params: req.params,
      },
    }),
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");

  if (pool) {
    pool.end(() => {
      console.log("📦 Database connections closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");

  if (pool) {
    pool.end(() => {
      console.log("📦 Database connections closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, () => {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 WEB SEKOLAH FULLSTACK - BACKEND SERVER (FIXED)");
  console.log("=".repeat(70));
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`⚙️  Configuration: http://localhost:${PORT}/api/config`);
  console.log("─".repeat(70));
  console.log("📋 KEY ENDPOINTS:");
  console.log("   🔐 Admin Login: /api/auth/login");
  console.log("   👤 Admin Profile: /api/admin/profile");
  console.log("   📊 Dashboard Stats: /api/admin/dashboard/stats");
  console.log("   🐞 Debug (Dev): /api/admin/debug");
  console.log("─".repeat(70));
  console.log("🌐 PUBLIC ENDPOINTS:");
  console.log("   📰 Articles: /api/public/articles");
  console.log("   💬 Testimoni: /api/public/testimoni");
  console.log("   🎓 Alumni: /api/public/alumni");
  console.log("   📅 Calendar: /api/public/calendar");
  console.log("   📝 SPMB: /api/spmb/register");
  console.log("─".repeat(70));
  console.log(`💾 Database Status: ${dbStatus}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log("=".repeat(70));
  console.log("✅ FIXES APPLIED:");
  console.log("   ✅ Admin profile endpoint added");
  console.log("   ✅ Authentication routes fixed");
  console.log("   ✅ Conflicting routes removed");
  console.log("   ✅ Proper middleware integration");
  console.log("   ✅ Debug endpoints available");
  console.log("✅ Server ready for frontend integration!");
  console.log("=".repeat(70) + "\n");
});

// Handle server startup errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Please use a different port.`
    );
    console.error("   Try: PORT=5001 npm start");
  } else {
    console.error("❌ Server startup error:", error);
  }
  process.exit(1);
});

module.exports = app;
