const { body, validationResult } = require("express-validator");

// Middleware to check validation results
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  name: body("nama_lengkap")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nama lengkap harus antara 2-100 karakter"),

  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Format email tidak valid"),

  phone: body("no_hp")
    .isMobilePhone("id-ID")
    .withMessage("Format nomor HP tidak valid"),

  nik: body("nik")
    .isLength({ min: 16, max: 16 })
    .isNumeric()
    .withMessage("NIK harus 16 digit angka"),

  required: (field) =>
    body(field).notEmpty().withMessage(`${field} tidak boleh kosong`),
};

module.exports = {
  checkValidationResult,
  validationRules,
};
