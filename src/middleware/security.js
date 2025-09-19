// src/middleware/security.js - Advanced Security Features
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss");
const validator = require("validator");
const { pool } = require("../config/database");

class SecurityManager {
  constructor() {
    this.blockedIPs = new Set();
    this.suspiciousActivities = new Map();
    this.initializeSecurityTables();
  }

  // Initialize security tables
  async initializeSecurityTables() {
    try {
      // Create security logs table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS security_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ip_address VARCHAR(45) NOT NULL,
          user_agent TEXT,
          endpoint VARCHAR(255),
          method VARCHAR(10),
          attempt_type ENUM('login', 'registration', 'api_access', 'file_upload', 'suspicious') DEFAULT 'api_access',
          status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
          reason TEXT,
          user_id INT NULL,
          session_id VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_ip_address (ip_address),
          INDEX idx_attempt_type (attempt_type),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        )
      `);

      // Create blocked IPs table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS blocked_ips (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ip_address VARCHAR(45) NOT NULL UNIQUE,
          reason TEXT,
          blocked_until TIMESTAMP NULL,
          permanent BOOLEAN DEFAULT FALSE,
          blocked_by VARCHAR(100) DEFAULT 'system',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_ip_address (ip_address),
          INDEX idx_blocked_until (blocked_until)
        )
      `);

      // Create rate limit tracking table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS rate_limit_tracking (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ip_address VARCHAR(45) NOT NULL,
          endpoint VARCHAR(255) NOT NULL,
          request_count INT DEFAULT 1,
          window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_request TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_ip_endpoint (ip_address, endpoint),
          INDEX idx_window_start (window_start),
          UNIQUE KEY unique_ip_endpoint_window (ip_address, endpoint, window_start)
        )
      `);

      console.log("✅ Security tables initialized");
    } catch (error) {
      console.error("❌ Security tables initialization failed:", error);
    }
  }

  // Enhanced helmet configuration
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // For development
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  // General API rate limiter
  getGeneralRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: "Too many requests from this IP, please try again later",
        error: "rate_limit_exceeded",
        retry_after: 900, // seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: async (req, res) => {
        await this.logSecurityEvent(
          req,
          "api_access",
          "blocked",
          "Rate limit exceeded"
        );
        res.status(429).json({
          success: false,
          message: "Too many requests from this IP, please try again later",
          error: "rate_limit_exceeded",
        });
      },
    });
  }

  // Strict rate limiter for registration endpoints
  getRegistrationRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // limit each IP to 3 registrations per hour
      message: {
        success: false,
        message: "Too many registration attempts. Please try again later",
        error: "registration_rate_limit",
      },
      handler: async (req, res) => {
        await this.logSecurityEvent(
          req,
          "registration",
          "blocked",
          "Registration rate limit exceeded"
        );
        res.status(429).json({
          success: false,
          message: "Too many registration attempts. Please try again later",
          error: "registration_rate_limit",
        });
      },
    });
  }

  // Login rate limiter
  getLoginRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per 15 minutes
      message: {
        success: false,
        message: "Too many login attempts. Please try again later",
        error: "login_rate_limit",
      },
      handler: async (req, res) => {
        await this.logSecurityEvent(
          req,
          "login",
          "blocked",
          "Login rate limit exceeded"
        );
        res.status(429).json({
          success: false,
          message: "Too many login attempts. Please try again later",
          error: "login_rate_limit",
        });
      },
    });
  }

  // Input sanitization middleware
  sanitizeInput() {
    return (req, res, next) => {
      const sanitizeObject = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === "string") {
            // XSS protection
            obj[key] = xss(obj[key], {
              whiteList: {}, // No HTML tags allowed
              stripIgnoreTag: true,
              stripIgnoreTagBody: ["script"],
            });

            // SQL injection protection - basic sanitization
            obj[key] = obj[key].replace(/['"\\;]/g, "");

            // Trim whitespace
            obj[key] = obj[key].trim();
          } else if (typeof obj[key] === "object" && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      };

      if (req.body) {
        sanitizeObject(req.body);
      }
      if (req.query) {
        sanitizeObject(req.query);
      }
      if (req.params) {
        sanitizeObject(req.params);
      }

      next();
    };
  }

  // Advanced input validation middleware
  validateInputs() {
    return (req, res, next) => {
      const errors = [];

      // Validate email fields
      if (req.body.email && !validator.isEmail(req.body.email)) {
        errors.push("Invalid email format");
      }

      // Validate phone numbers
      if (
        req.body.nomor_whatsapp_aktif &&
        !validator.isMobilePhone(req.body.nomor_whatsapp_aktif, "id-ID")
      ) {
        // Allow Indonesian format validation to be flexible
        if (
          !/^(\+62|62|0)[\s\-]?8[1-9][0-9]{6,10}$/.test(
            req.body.nomor_whatsapp_aktif.replace(/\s/g, "")
          )
        ) {
          errors.push("Invalid WhatsApp number format");
        }
      }

      // Validate dates
      if (req.body.tanggal_lahir && !validator.isDate(req.body.tanggal_lahir)) {
        errors.push("Invalid birth date format");
      }

      // Validate URLs
      if (
        req.body.school_website &&
        req.body.school_website !== "" &&
        !validator.isURL(req.body.school_website)
      ) {
        errors.push("Invalid website URL format");
      }

      // Check for potentially malicious content
      const maliciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /union\s+select/gi,
        /drop\s+table/gi,
        /delete\s+from/gi,
      ];

      const checkForMaliciousContent = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === "string") {
            maliciousPatterns.forEach((pattern) => {
              if (pattern.test(obj[key])) {
                errors.push(`Potentially malicious content detected in ${key}`);
              }
            });
          }
        }
      };

      if (req.body) checkForMaliciousContent(req.body);
      if (req.query) checkForMaliciousContent(req.query);

      if (errors.length > 0) {
        this.logSecurityEvent(
          req,
          "suspicious",
          "blocked",
          `Input validation failed: ${errors.join(", ")}`
        );
        return res.status(400).json({
          success: false,
          message: "Input validation failed",
          errors: errors,
        });
      }

      next();
    };
  }

  // File upload security middleware
  validateFileUpload() {
    return (req, res, next) => {
      if (!req.files) {
        return next();
      }

      const errors = [];
      const allowedTypes = {
        pas_foto: ["image/jpeg", "image/jpg", "image/png"],
        bukti_pembayaran: ["application/pdf"],
        ijazah: ["application/pdf"],
        akta_kelahiran: ["application/pdf"],
        kartu_keluarga: ["application/pdf"],
        surat_keterangan_lulus: ["application/pdf"],
        logo: [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
      };

      const maxSizes = {
        pas_foto: 2 * 1024 * 1024, // 2MB
        bukti_pembayaran: 5 * 1024 * 1024, // 5MB
        ijazah: 5 * 1024 * 1024, // 5MB
        akta_kelahiran: 5 * 1024 * 1024, // 5MB
        kartu_keluarga: 5 * 1024 * 1024, // 5MB
        surat_keterangan_lulus: 5 * 1024 * 1024, // 5MB
        logo: 2 * 1024 * 1024, // 2MB
      };

      Object.keys(req.files).forEach((fieldName) => {
        const files = Array.isArray(req.files[fieldName])
          ? req.files[fieldName]
          : [req.files[fieldName]];

        files.forEach((file) => {
          // Check file type
          if (
            allowedTypes[fieldName] &&
            !allowedTypes[fieldName].includes(file.mimetype)
          ) {
            errors.push(
              `Invalid file type for ${fieldName}. Allowed: ${allowedTypes[
                fieldName
              ].join(", ")}`
            );
          }

          // Check file size
          if (maxSizes[fieldName] && file.size > maxSizes[fieldName]) {
            errors.push(
              `File too large for ${fieldName}. Maximum: ${Math.round(
                maxSizes[fieldName] / 1024 / 1024
              )}MB`
            );
          }

          // Check for executable files
          const dangerousExtensions = [
            ".exe",
            ".bat",
            ".cmd",
            ".sh",
            ".ps1",
            ".php",
            ".asp",
            ".jsp",
          ];
          const fileExtension = file.originalname
            .toLowerCase()
            .substring(file.originalname.lastIndexOf("."));
          if (dangerousExtensions.includes(fileExtension)) {
            errors.push(`Dangerous file type detected: ${fileExtension}`);
          }
        });
      });

      if (errors.length > 0) {
        this.logSecurityEvent(
          req,
          "file_upload",
          "blocked",
          `File validation failed: ${errors.join(", ")}`
        );
        return res.status(400).json({
          success: false,
          message: "File validation failed",
          errors: errors,
        });
      }

      next();
    };
  }

  // IP blocking middleware
  blockSuspiciousIPs() {
    return async (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;

      try {
        // Check if IP is in blocked list
        const [blockedResult] = await pool.execute(
          "SELECT * FROM blocked_ips WHERE ip_address = ? AND (blocked_until IS NULL OR blocked_until > NOW())",
          [clientIP]
        );

        if (blockedResult.length > 0) {
          const blockedInfo = blockedResult[0];
          await this.logSecurityEvent(
            req,
            "api_access",
            "blocked",
            `IP blocked: ${blockedInfo.reason}`
          );

          return res.status(403).json({
            success: false,
            message: "Access denied. Your IP has been blocked.",
            error: "ip_blocked",
            blocked_until: blockedInfo.blocked_until,
          });
        }

        // Check for suspicious activity patterns
        await this.checkSuspiciousActivity(clientIP, req);

        next();
      } catch (error) {
        console.error("IP blocking check error:", error);
        next(); // Continue on error to avoid breaking the application
      }
    };
  }

  // Check for suspicious activity patterns
  async checkSuspiciousActivity(ip, req) {
    const currentTime = Date.now();
    const timeWindow = 60000; // 1 minute

    if (!this.suspiciousActivities.has(ip)) {
      this.suspiciousActivities.set(ip, {
        requests: [],
        failedLogins: 0,
        lastFailedLogin: 0,
      });
    }

    const activity = this.suspiciousActivities.get(ip);

    // Track request frequency
    activity.requests.push(currentTime);
    activity.requests = activity.requests.filter(
      (time) => currentTime - time <= timeWindow
    );

    // Check for rapid-fire requests (more than 30 requests per minute)
    if (activity.requests.length > 30) {
      await this.temporaryBlockIP(ip, "Rapid-fire requests detected", 15); // Block for 15 minutes
      return;
    }

    // Check for scanning behavior (accessing many different endpoints rapidly)
    const recentEndpoints = new Set();
    const endpointWindow = 120000; // 2 minutes

    if (activity.requests.length > 10) {
      recentEndpoints.add(req.path);
      if (recentEndpoints.size > 15) {
        await this.temporaryBlockIP(
          ip,
          "Endpoint scanning behavior detected",
          30
        ); // Block for 30 minutes
      }
    }
  }

  // Temporarily block IP
  async temporaryBlockIP(ip, reason, minutes) {
    try {
      const blockedUntil = new Date(Date.now() + minutes * 60000);

      await pool.execute(
        `
        INSERT INTO blocked_ips (ip_address, reason, blocked_until, blocked_by)
        VALUES (?, ?, ?, 'auto_system')
        ON DUPLICATE KEY UPDATE
        blocked_until = VALUES(blocked_until),
        reason = VALUES(reason)
      `,
        [ip, reason, blockedUntil]
      );

      console.log(
        `🚫 Temporarily blocked IP ${ip} for ${minutes} minutes: ${reason}`
      );
    } catch (error) {
      console.error("Temporary IP block failed:", error);
    }
  }

  // Log security events
  async logSecurityEvent(req, attemptType, status, reason = null) {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get("User-Agent") || "";
      const endpoint = req.path || "";
      const method = req.method || "";

      await pool.execute(
        `
        INSERT INTO security_logs (
          ip_address, user_agent, endpoint, method, 
          attempt_type, status, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          clientIP,
          userAgent.substring(0, 500), // Limit user agent length
          endpoint,
          method,
          attemptType,
          status,
          reason,
        ]
      );
    } catch (error) {
      console.error("Security logging failed:", error);
    }
  }

  // Get security dashboard data
  async getSecurityDashboard() {
    try {
      // Get recent security events
      const [recentEvents] = await pool.execute(`
        SELECT ip_address, attempt_type, status, reason, created_at
        FROM security_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY created_at DESC 
        LIMIT 100
      `);

      // Get blocked IPs
      const [blockedIPs] = await pool.execute(`
        SELECT ip_address, reason, blocked_until, permanent, created_at
        FROM blocked_ips 
        WHERE blocked_until IS NULL OR blocked_until > NOW()
        ORDER BY created_at DESC
      `);

      // Get attack statistics
      const [attackStats] = await pool.execute(`
        SELECT 
          attempt_type,
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM security_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY attempt_type, status, DATE(created_at)
        ORDER BY date DESC, count DESC
      `);

      // Get top attacking IPs
      const [topAttackers] = await pool.execute(`
        SELECT 
          ip_address,
          COUNT(*) as attack_count,
          MAX(created_at) as last_attack
        FROM security_logs 
        WHERE status IN ('failed', 'blocked') 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY ip_address
        HAVING attack_count > 5
        ORDER BY attack_count DESC
        LIMIT 20
      `);

      return {
        recent_events: recentEvents,
        blocked_ips: blockedIPs,
        attack_statistics: attackStats,
        top_attackers: topAttackers,
        summary: {
          total_events_24h: recentEvents.length,
          blocked_ips_count: blockedIPs.length,
          unique_attackers: topAttackers.length,
        },
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Security dashboard error:", error);
      throw error;
    }
  }

  // Clean up old security logs
  async cleanupSecurityLogs() {
    try {
      const [result] = await pool.execute(`
        DELETE FROM security_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `);

      // Remove expired IP blocks
      const [expiredBlocks] = await pool.execute(`
        DELETE FROM blocked_ips 
        WHERE permanent = FALSE AND blocked_until < NOW()
      `);

      // Clear in-memory suspicious activities cache
      this.suspiciousActivities.clear();

      console.log(
        `✅ Security cleanup: ${result.affectedRows} logs deleted, ${expiredBlocks.affectedRows} IP blocks expired`
      );

      return {
        logs_deleted: result.affectedRows,
        blocks_expired: expiredBlocks.affectedRows,
      };
    } catch (error) {
      console.error("Security logs cleanup failed:", error);
      throw error;
    }
  }

  // Emergency lockdown mode
  async enableEmergencyLockdown(reason, duration_minutes = 60) {
    try {
      // Create emergency lockdown record
      await pool.execute(
        `
        INSERT INTO blocked_ips (ip_address, reason, blocked_until, blocked_by, permanent)
        VALUES ('0.0.0.0/0', ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 'emergency_system', FALSE)
        ON DUPLICATE KEY UPDATE
        blocked_until = VALUES(blocked_until),
        reason = VALUES(reason)
      `,
        [reason, duration_minutes]
      );

      console.log(
        `🚨 EMERGENCY LOCKDOWN ENABLED: ${reason} (Duration: ${duration_minutes} minutes)`
      );

      return {
        lockdown_enabled: true,
        reason: reason,
        duration_minutes: duration_minutes,
        enabled_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Emergency lockdown failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SecurityManager();
