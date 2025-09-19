const { body } = require("express-validator");

const spmb_validation = [
  // Biodata Siswa
  body("nama_lengkap")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nama lengkap harus antara 3-100 karakter"),

  body("nik")
    .isLength({ min: 16, max: 16 })
    .isNumeric()
    .withMessage("NIK harus 16 digit angka"),

  body("jenis_kelamin")
    .isIn(["L", "P"])
    .withMessage("Jenis kelamin harus L atau P"),

  body("tempat_lahir")
    .trim()
    .notEmpty()
    .withMessage("Tempat lahir tidak boleh kosong"),

  body("tanggal_lahir")
    .isISO8601()
    .withMessage("Format tanggal lahir tidak valid"),

  body("agama")
    .isIn(["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"])
    .withMessage("Agama tidak valid"),

  body("alamat_lengkap")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Alamat lengkap harus antara 10-500 karakter"),

  body("no_hp")
    .isMobilePhone("id-ID")
    .withMessage("Format nomor HP tidak valid"),

  body("email").optional().isEmail().withMessage("Format email tidak valid"),

  // Data Orang Tua
  body("nama_ayah")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nama ayah harus antara 3-100 karakter"),

  body("nik_ayah")
    .isLength({ min: 16, max: 16 })
    .isNumeric()
    .withMessage("NIK ayah harus 16 digit angka"),

  body("nama_ibu")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nama ibu harus antara 3-100 karakter"),

  body("nik_ibu")
    .isLength({ min: 16, max: 16 })
    .isNumeric()
    .withMessage("NIK ibu harus 16 digit angka"),

  // Data Sekolah
  body("sekolah_asal")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Nama sekolah asal harus antara 5-100 karakter"),

  body("pilihan_program_1")
    .isInt({ min: 1 })
    .withMessage("Pilihan program 1 harus dipilih"),

  // Custom validation for unique NIK
  body("nik").custom(async (value, { req }) => {
    const { pool } = require("../config/database");
    const [rows] = await pool.execute(
      "SELECT id FROM pendaftar_spmb WHERE nik = ?",
      [value]
    );

    if (rows.length > 0) {
      throw new Error("NIK sudah terdaftar");
    }
    return true;
  }),
];

module.exports = spmb_validation;
