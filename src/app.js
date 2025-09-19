const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const { testConnection } = require("./config/database");

const app = express();

// Security middleware
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/health", require("./routes/health"));
app.use("/api/test", require("./routes/test"));

// Add to existing routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/spmb", require("./routes/spmb"));

// Admin routes
app.use("/api/admin/spmb", require("./routes/admin/spmb"));
app.use("/api/admin/articles", require("./routes/admin/articles"));
app.use("/api/admin/categories", require("./routes/admin/categories"));

// Welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SMK Sekolah Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      test: "/api/test",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      "GET /",
      "GET /api/health",
      "GET /api/health/server",
      "GET /api/health/database",
      "GET /api/test/students",
      "POST /api/test/student",
      "GET /api/test/student/:id",
      "PUT /api/test/student/:id",
      "DELETE /api/test/student/:id",
    ],
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Initialize database connection
const initializeApp = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error(
        "❌ Failed to connect to database. Please check your configuration."
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error initializing app:", error);
    process.exit(1);
  }
};

module.exports = { app, initializeApp };
