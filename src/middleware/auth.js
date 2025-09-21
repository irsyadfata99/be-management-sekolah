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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "school_template_secret"
    );

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token structure",
      });
    }

    const [users] = await pool.execute(
      `SELECT id, username, email, full_name, role, is_active, 
              can_manage_students, can_manage_settings, can_export_data, can_manage_admins 
       FROM admin_users WHERE id = ? AND is_active = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
      });
    }

    const user = users[0];

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email || "",
      full_name: user.full_name || "",
      role: user.role || "admin",
      is_active: user.is_active,
      can_manage_students: user.can_manage_students,
      can_manage_settings: user.can_manage_settings,
      can_export_data: user.can_export_data,
      can_manage_admins: user.can_manage_admins,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Authentication error",
      });
    }
  }
};

const requireAdmin = (req, res, next) => {
  try {
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
      });
    }

    if (!req.user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin check error",
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const hasPermission = checkPermission(req.user, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${permission.replace(
            "_",
            " "
          )} permission required.`,
        });
      }

      next();
    } catch (error) {
      console.error(`Permission '${permission}' error:`, error);
      return res.status(500).json({
        success: false,
        message: "Permission check error",
      });
    }
  };
};

const checkPermission = (user, permission) => {
  if (!user || !user.is_active) {
    return false;
  }

  if (user.role === "admin" && user.can_manage_admins) {
    return true;
  }

  switch (permission) {
    case "manage_students":
    case "can_manage_students":
      return Boolean(user.can_manage_students);

    case "manage_settings":
    case "can_manage_settings":
      return Boolean(user.can_manage_settings);

    case "export_data":
    case "can_export_data":
      return Boolean(user.can_export_data);

    case "manage_admins":
    case "can_manage_admins":
      return Boolean(user.can_manage_admins);

    default:
      return false;
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  checkPermission,
};
