// FILE: src/utils/auth.js
// Authentication utilities and helper functions

const crypto = require("crypto");
const bcrypt = require("bcrypt");

class AuthUtils {
  /**
   * Generate unique registration number
   * Format: SMK2025001, SMK2025002, etc.
   */
  static generateNomorPendaftaran() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp

    return `SMK${year}${randomNum}${timestamp}`.slice(0, 12); // Limit to 12 characters
  }

  /**
   * Generate 6-digit PIN for student login
   */
  static generatePIN() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (Indonesian format)
   */
  static isValidPhone(phone) {
    // Indonesian phone number: starts with 08 or +62, 10-15 digits
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ""));
  }

  /**
   * Validate NISN (10 digits)
   */
  static isValidNISN(nisn) {
    const nisnRegex = /^[0-9]{10}$/;
    return nisnRegex.test(nisn);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input) {
    if (typeof input !== "string") return input;

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 500); // Limit length
  }

  /**
   * Format currency to Indonesian Rupiah
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date to Indonesian format
   */
  static formatDate(date, includeTime = false) {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return new Intl.DateTimeFormat("id-ID", options).format(new Date(date));
  }

  /**
   * Validate file upload
   */
  static validateFile(file, allowedTypes = [], maxSizeKB = 5120) {
    const errors = [];

    if (!file) {
      errors.push("File is required");
      return errors;
    }

    // Check file size (in KB)
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      errors.push(
        `File size must be less than ${maxSizeKB}KB (current: ${Math.round(
          fileSizeKB
        )}KB)`
      );
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const fileExt = file.originalname.split(".").pop().toLowerCase();
      const mimeTypeValid = allowedTypes.some((type) => {
        if (type === "pdf") return file.mimetype === "application/pdf";
        if (["jpg", "jpeg"].includes(type))
          return file.mimetype.startsWith("image/jpeg");
        if (type === "png") return file.mimetype === "image/png";
        return false;
      });

      if (!mimeTypeValid) {
        errors.push(`File type must be one of: ${allowedTypes.join(", ")}`);
      }
    }

    return errors;
  }

  /**
   * Generate slug from string
   */
  static generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Check if user is admin
   */
  static isAdmin(user) {
    return user && user.role === "admin" && user.is_active;
  }

  /**
   * Check if user has permission
   */
  static hasPermission(user, permission) {
    if (!user || !user.is_active) return false;

    switch (permission) {
      case "manage_students":
        return user.can_manage_students;
      case "manage_settings":
        return user.can_manage_settings;
      case "export_data":
        return user.can_export_data;
      case "manage_admins":
        return user.can_manage_admins;
      default:
        return false;
    }
  }

  /**
   * Log activity (simple logging)
   */
  static logActivity(action, details = {}, userId = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      user_id: userId,
      details,
      ip: details.ip || "unknown",
    };

    // In production, you might want to save this to database
    console.log("ACTIVITY LOG:", JSON.stringify(logEntry));

    return logEntry;
  }

  /**
   * Validate registration data
   */
  static validateRegistrationData(data) {
    const errors = [];

    // Required fields validation
    const requiredFields = [
      "nama_lengkap",
      "nomor_whatsapp_aktif",
      "tempat_lahir",
      "tanggal_lahir",
      "jenis_kelamin",
      "agama",
      "alamat_siswa",
      "asal_sekolah",
      "tahun_lulus",
      "nama_orang_tua",
      "pekerjaan_orang_tua",
      "pilihan_jurusan_id",
      "pilihan_pembayaran_id",
    ];

    requiredFields.forEach((field) => {
      if (!data[field] || data[field].toString().trim() === "") {
        errors.push(`${field} is required`);
      }
    });

    // Specific validations
    if (
      data.nomor_whatsapp_aktif &&
      !this.isValidPhone(data.nomor_whatsapp_aktif)
    ) {
      errors.push("Invalid WhatsApp number format");
    }

    if (data.nisn && !this.isValidNISN(data.nisn)) {
      errors.push("NISN must be 10 digits");
    }

    if (data.tahun_lulus) {
      const year = parseInt(data.tahun_lulus);
      const currentYear = new Date().getFullYear();
      if (year < 2010 || year > currentYear + 1) {
        errors.push("Invalid graduation year");
      }
    }

    if (data.tanggal_lahir) {
      const birthDate = new Date(data.tanggal_lahir);
      const age = (new Date() - birthDate) / (1000 * 60 * 60 * 24 * 365);
      if (age < 13 || age > 25) {
        errors.push("Age must be between 13 and 25 years");
      }
    }

    return errors;
  }

  /**
   * Generate export filename
   */
  static generateExportFilename(type, extension = "xlsx") {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-");
    return `${type}-export-${timestamp}.${extension}`;
  }

  /**
   * Calculate statistics
   */
  static calculateStats(data, groupBy = null) {
    if (!Array.isArray(data)) return {};

    const stats = {
      total: data.length,
      by_status: {},
      by_jurusan: {},
      recent: [],
    };

    // Group by status
    data.forEach((item) => {
      const status = item.status_pendaftaran || "unknown";
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
    });

    // Group by jurusan
    data.forEach((item) => {
      const jurusan = item.nama_jurusan || "unknown";
      stats.by_jurusan[jurusan] = (stats.by_jurusan[jurusan] || 0) + 1;
    });

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    stats.recent = data.filter(
      (item) => new Date(item.tanggal_daftar) >= sevenDaysAgo
    ).length;

    return stats;
  }

  /**
   * Validate color hex code
   */
  static isValidHexColor(color) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  /**
   * Generate QR code data for registration
   */
  static generateQRData(noPendaftaran, pin) {
    return JSON.stringify({
      no_pendaftaran: noPendaftaran,
      pin: pin,
      type: "spmb_registration",
      generated_at: new Date().toISOString(),
    });
  }
}

module.exports = AuthUtils;
