// ============================================================================
// FINAL WORKING AUTH MIDDLEWARE - Clean & Complete
// File: src/middleware/auth.js
// ============================================================================

const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// ============================================================================
// Main authentication middleware
// ============================================================================
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
    console.log("JWT Secret exists:", !!process.env.JWT_SECRET);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "school_template_secret"
    );
    console.log("✅ Token decoded successfully:", decoded);

    // Get user from database - handle both 'id' and 'userId' in token
    const userId = decoded.userId || decoded.id;
    console.log("Looking for user ID:", userId);

    const [users] = await pool.execute(
      `SELECT id, username, email, full_name, role, is_active, 
              can_manage_students, can_manage_settings, can_export_data, can_manage_admins 
       FROM admin_users WHERE id = ? AND is_active = 1`,
      [userId]
    );

    console.log("Database query result:", users);

    if (users.length === 0) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
        debug: `User ID ${userId} not found or inactive`,
      });
    }

    const user = users[0];
    console.log("✅ User found:", {
      id: user.id,
      username: user.username,
      role: user.role,
      can_manage_settings: user.can_manage_settings,
    });

    // Attach user to request object (use both for compatibility)
    req.user = user;
    req.admin = user; // For compatibility with existing code

    console.log("✅ Authentication successful for:", user.username);
    console.log("=== AUTH MIDDLEWARE END ===");

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);

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

// ============================================================================
// Admin role requirement
// ============================================================================
const requireAdmin = (req, res, next) => {
  try {
    console.log("=== ADMIN CHECK ===");

    if (!req.user && !req.admin) {
      console.log("❌ No user found in request");
      return res.status(401).json({
        success: false,
        message: "Authentication required - user not found",
      });
    }

    // Use req.admin if available, fallback to req.user
    const user = req.admin || req.user;

    if (user.role !== "admin") {
      console.log("❌ User is not admin:", user.role);
      return res.status(403).json({
        success: false,
        message: "Admin access required",
        user_role: user.role,
      });
    }

    if (!user.is_active) {
      console.log("❌ User account is inactive");
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    console.log("✅ Admin check passed:", user.username);
    next();
  } catch (error) {
    console.error("❌ Admin check error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin check error",
      debug: error.message,
    });
  }
};

// ============================================================================
// Permission-based middleware
// ============================================================================
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      console.log(`=== PERMISSION CHECK: ${permission} ===`);

      if (!req.user && !req.admin) {
        console.log("❌ No user found in request");
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Use req.admin if available, fallback to req.user
      const user = req.admin || req.user;

      console.log("User permissions:", {
        can_manage_students: user.can_manage_students,
        can_manage_settings: user.can_manage_settings,
        can_export_data: user.can_export_data,
        can_manage_admins: user.can_manage_admins,
      });

      // Check specific permission
      const hasPermission = checkPermission(user, permission);
      console.log(`Permission ${permission}:`, hasPermission);

      if (!hasPermission) {
        console.log(`❌ Permission denied: ${permission}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. ${permission.replace(
            "_",
            " "
          )} permission required.`,
          user_permissions: {
            can_manage_students: user.can_manage_students,
            can_manage_settings: user.can_manage_settings,
            can_export_data: user.can_export_data,
            can_manage_admins: user.can_manage_admins,
          },
        });
      }

      console.log(`✅ Permission granted: ${permission}`);
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

// ============================================================================
// Permission checker function
// ============================================================================
const checkPermission = (user, permission) => {
  if (!user || !user.is_active) {
    console.log("❌ User not active or not found");
    return false;
  }

  // Super admin has all permissions
  if (user.role === "admin" && user.can_manage_admins) {
    console.log("✅ Super admin access granted");
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

    // Additional permissions
    case "manage_personnel":
      return Boolean(user.can_manage_settings); // Personnel requires settings permission

    case "manage_articles":
      return Boolean(user.can_manage_settings); // Article management requires settings permission

    case "manage_calendar":
      return Boolean(user.can_manage_settings); // Calendar requires settings permission

    default:
      console.log(`❌ Unknown permission: ${permission}`);
      return false;
  }
};

// ============================================================================
// Role-based middleware
// ============================================================================
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user && !req.admin) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = req.admin || req.user;
      const userRole = user.role;
      const hasRole = Array.isArray(allowedRoles)
        ? allowedRoles.includes(userRole)
        : allowedRoles === userRole;

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

// ============================================================================
// GET /api/auth/profile endpoint (embedded in middleware)
// ============================================================================
const getProfile = (req, res) => {
  try {
    console.log("=== GET PROFILE REQUEST ===");

    // Handle both req.admin and req.user
    const currentUser = req.admin || req.user;

    if (!currentUser) {
      console.log("❌ No user found in request object");
      return res.status(401).json({
        success: false,
        message: "User not found in request",
      });
    }

    console.log("✅ Profile retrieved for:", currentUser.username);

    // Proper response format that will show in test
    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email || "",
        full_name: currentUser.full_name || "",
        role: currentUser.role,
        is_active: Boolean(currentUser.is_active),
        permissions: {
          can_manage_students: Boolean(currentUser.can_manage_students),
          can_manage_settings: Boolean(currentUser.can_manage_settings),
          can_export_data: Boolean(currentUser.can_export_data),
          can_manage_admins: Boolean(currentUser.can_manage_admins),
        },
        last_login: currentUser.last_login,
        created_at: currentUser.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
      error: error.message,
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  requireRole,
  checkPermission,
  getProfile, // Export profile function for use in routes
};
