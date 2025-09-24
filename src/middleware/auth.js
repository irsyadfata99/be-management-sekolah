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

    // UPDATED: Query to 'admins' table (sesuai database Anda)
    const [users] = await pool.execute(
      `SELECT id, username, email, full_name, role, status 
       FROM admins WHERE id = ? AND status = 'active'`,
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
      status: user.status,
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

    if (req.user.status !== "active") {
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

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      console.error(`Role check error:`, error);
      return res.status(500).json({
        success: false,
        message: "Role check error",
      });
    }
  };
};

const requireSuperAdmin = requireRole("super_admin");

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requireSuperAdmin,
};
