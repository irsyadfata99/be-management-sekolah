// src/utils/auth.js
// Utility functions for SPMB registration

class AuthUtils {
  static generateNomorPendaftaran() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SMK${timestamp.toString().slice(-5)}${random}`;
  }

  static generatePIN() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = AuthUtils;
