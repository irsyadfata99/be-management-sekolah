const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// Main authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE DEBUG ===");
    console.log("Headers received:", req.headers);

    const authHeader = req.headers["authorization"];
    console.log("Auth header:", authHeader);

    if (!authHeader) {
      console.log("❌ No authorization header found");
      return res.status(401).json({
        success: false,
        message: "Access token required",
        debug: "No authorization header provided",
      });
    }

    // Handle both "Bearer TOKEN" and just "TOKEN" formats
    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      console.log("✅ Bearer token extracted");
    } else {
      token = authHeader;
      console.log("✅ Direct token extracted");
    }

    console.log("Token (first 20 chars):", token.substring(0, 20) + "...");

    // Verify JWT
    console.log("JWT Secret (first 10 chars):", process.env.JWT_SECRET?.substring(0, 10) + "...");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded successfully:", decoded);

    // Get user from database - handle both 'id' and 'userId' in token
    const userId = decoded.userId || decoded.id;
    console.log("Looking for user ID:", userId);

    const [users] = await pool.execute("SELECT id, username, email, full_name, role, is_active, can_manage_students, can_manage_settings, can_export_data, can_manage_admins FROM admin_users WHERE id = ? AND is_active = 1", [userId]);

    console.log("Database query result:", users);

    if (users.length === 0) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
        debug: `User ID ${userId} not found or inactive`,
      });
    }

    req.user = users[0];
    console.log("✅ User authenticated:", req.user);
    console.log("=== AUTH MIDDLEWARE END ===");

    next();
  } catch (error) {
    console.log("❌ Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        debug: error.message,
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        debug: error.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        debug: error.message,
      });
    }
  }
};

// 🔥 NEW: Admin-only middleware
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate the token
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
        user_role: req.user.role,
      });
    }

    if (!req.user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    console.log("✅ Admin authentication passed:", req.user.username);
    next();
  } catch (error) {
    console.error("❌ Admin auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin authentication error",
      debug: error.message,
    });
  }
};

// 🔥 NEW: Permission-based middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // First authenticate
      await new Promise((resolve, reject) => {
        authenticateToken(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Check specific permission
      const hasPermission = checkPermission(req.user, permission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`,
          user_permissions: {
            can_manage_students: req.user.can_manage_students,
            can_manage_settings: req.user.can_manage_settings,
            can_export_data: req.user.can_export_data,
            can_manage_admins: req.user.can_manage_admins,
          },
        });
      }

      console.log(`✅ Permission '${permission}' granted to:`, req.user.username);
      next();
    } catch (error) {
      console.error(`❌ Permission '${permission}' error:`, error);
      return res.status(500).json({
        success: false,
        message: "Permission check error",
        debug: error.message,
      });
    }
  };
};

// Helper function to check permissions
const checkPermission = (user, permission) => {
  if (!user || !user.is_active) return false;
  if (user.role === "admin" && user.can_manage_admins) return true; // Super admin

  switch (permission) {
    case "manage_students":
      return user.can_manage_students;
    case "manage_settings":
      return user.can_manage_settings;
    case "export_data":
      return user.can_export_data;
    case "manage_admins":
      return user.can_manage_admins;
    case "manage_personnel":
      return user.can_manage_settings; // Personnel management requires settings permission
    default:
      return false;
  }
};

// 🔥 NEW: Role-based middleware
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      await new Promise((resolve, reject) => {
        authenticateToken(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRole = req.user.role;
      const hasRole = Array.isArray(allowedRoles) ? allowedRoles.includes(userRole) : allowedRoles === userRole;

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Role access denied. Required: ${allowedRoles}, Current: ${userRole}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Role check error",
        debug: error.message,
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  requireRole,
  checkPermission,
};
