// src/routes/email.js - Complete Email Routes with /health endpoint
const express = require("express");
const router = express.Router();
const emailService = require("../services/emailService");

// Health check for email service - MISSING ENDPOINT
router.get("/health", async (req, res) => {
  try {
    const configTest = await emailService.testEmailConfig();

    res.json({
      success: true,
      message: "Email service health check",
      data: {
        email_service_status: configTest.success ? "healthy" : "unhealthy",
        smtp_host: process.env.SMTP_HOST || "not_configured",
        smtp_port: process.env.SMTP_PORT || "not_configured",
        smtp_user_configured: !!process.env.SMTP_USER,
        smtp_pass_configured: !!process.env.SMTP_PASS,
        send_emails_enabled: process.env.SEND_EMAILS !== "false",
        transporter_ready: !!emailService.transporter,
      },
      error: configTest.error || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email service health check failed",
      error: error.message,
    });
  }
});

// Test email configuration
router.get("/test-config", async (req, res) => {
  try {
    const result = await emailService.testEmailConfig();

    res.json({
      success: result.success,
      message: result.success
        ? "Email configuration is working"
        : "Email configuration failed",
      error: result.error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email configuration test failed",
      error: error.message,
    });
  }
});

// Send test email
router.post("/test-send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const result = await emailService.sendTestEmail(email);

    res.json({
      success: true,
      message: "Test email sent successfully",
      data: {
        messageId: result.messageId,
        recipient: email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});

// Get current email configuration status (without sensitive data)
router.get("/config-status", (req, res) => {
  res.json({
    success: true,
    message: "Email configuration status",
    data: {
      smtp_configured: !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ),
      smtp_host: process.env.SMTP_HOST || "not_set",
      smtp_port: process.env.SMTP_PORT || "not_set",
      smtp_user: process.env.SMTP_USER ? "configured" : "not_set",
      smtp_pass: process.env.SMTP_PASS ? "configured" : "not_set",
      send_emails: process.env.SEND_EMAILS !== "false",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

module.exports = router;
