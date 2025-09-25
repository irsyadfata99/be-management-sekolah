const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
        error: "NO_TOKEN",
      });
    }

    // Extract token (support both "Bearer TOKEN" and just "TOKEN" format)
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        error: "INVALID_FORMAT",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "school_template_secret"
    );

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure",
        error: "INVALID_TOKEN",
      });
    }

    // Fetch user from database
    const [users] = await pool.execute(
      `SELECT id, username, email, full_name, role, is_active,
              can_manage_students, can_manage_settings, 
              can_export_data, can_manage_admins
       FROM admin_users 
       WHERE id = ? AND is_active = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
        error: "USER_NOT_FOUND",
      });
    }

    // Attach user to request object
    req.user = {
      id: users[0].id,
      username: users[0].username,
      email: users[0].email || "",
      full_name: users[0].full_name || users[0].username,
      role: users[0].role || "admin",
      is_active: users[0].is_active,
      can_manage_students: users[0].can_manage_students || false,
      can_manage_settings: users[0].can_manage_settings || false,
      can_export_data: users[0].can_export_data || false,
      can_manage_admins: users[0].can_manage_admins || false,
    };

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: "JWT_INVALID",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
        error: "JWT_EXPIRED",
      });
    }

    // Database or other errors
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: "AUTH_ERROR",
    });
  }
};

/**
 * Admin authorization middleware
 * Requires user to be authenticated and active
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error: "NO_USER",
    });
  }

  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: "Account is inactive",
      error: "ACCOUNT_INACTIVE",
    });
  }

  next();
};

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Required role(s)
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "NO_USER",
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
        error: "INSUFFICIENT_ROLE",
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "NO_USER",
      });
    }

    if (!req.user[permission]) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
        error: "INSUFFICIENT_PERMISSION",
      });
    }

    next();
  };
};

/**
 * Super admin authorization
 */
const requireSuperAdmin = requireRole("super_admin");

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requireSuperAdmin,
};
