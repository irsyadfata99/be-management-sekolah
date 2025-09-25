// ============================================================================
// FIXED: src/middleware/auth.js - Consistent with admin_users table
// ============================================================================

const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    let token;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }

    console.log("Token received:", token.substring(0, 20) + "...");

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "school_template_secret"
    );

    console.log("Decoded token:", decoded);

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure - missing user ID",
      });
    }

    // FIXED: Query ke admin_users table (sama dengan auth route)
    const [users] = await pool.execute(
      `SELECT 
        id, username, email, full_name, role, 
        can_manage_students, can_manage_settings, can_export_data, can_manage_admins,
        is_active, last_login 
       FROM admin_users 
       WHERE id = ? AND is_active = 1`,
      [userId]
    );

    console.log(
      "Database query result:",
      users.length > 0 ? "User found" : "User not found"
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found or inactive",
      });
    }

    const user = users[0];

    // Set user object for subsequent middleware
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email || "",
      full_name: user.full_name || "",
      role: user.role || "admin",
      is_active: user.is_active,
      // Include permissions
      can_manage_students: user.can_manage_students,
      can_manage_settings: user.can_manage_settings,
      can_export_data: user.can_export_data,
      can_manage_admins: user.can_manage_admins,
    };

    console.log("Authentication successful for user:", user.username);
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        error: "JWT_INVALID",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        error: "JWT_EXPIRED",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Authentication error",
        error: "AUTH_ERROR",
      });
    }
  }
};

const requireAdmin = (req, res, next) => {
  try {
    console.log("RequireAdmin check for user:", req.user?.username);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "NO_USER",
      });
    }

    // FIXED: Check is_active instead of status
    if (!req.user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
        error: "ACCOUNT_INACTIVE",
      });
    }

    console.log("Admin access granted for:", req.user.username);
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin check error",
      error: "ADMIN_CHECK_ERROR",
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "NO_USER",
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(" or ")}`,
          error: "INSUFFICIENT_ROLE",
        });
      }

      next();
    } catch (error) {
      console.error(`Role check error:`, error);
      return res.status(500).json({
        success: false,
        message: "Role check error",
        error: "ROLE_CHECK_ERROR",
      });
    }
  };
};

// Permission-based middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user[permission]) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
      });
    }

    next();
  };
};

const requireSuperAdmin = requireRole("super_admin");

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requireSuperAdmin,
};
