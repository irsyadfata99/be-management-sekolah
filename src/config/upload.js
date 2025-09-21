const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDirs = [
  "uploads/spmb",
  "uploads/articles",
  "uploads/school",
  "uploads/temp",
  "uploads/personnel", // ADDED for personnel photos
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter for PDF only
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for documents"), false);
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Storage for SPMB documents (PDF only)
const spmb_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/spmb");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `${file.fieldname}-${uniqueSuffix}.pdf`;
    cb(null, filename);
  },
});

// Storage for articles (images)
const article_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/articles");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `article-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// Storage for school assets (logo, etc.)
const school_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/school");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `school-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// ADDED: Storage for personnel photos (3x4 professional photos)
const personnel_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/personnel");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `personnel-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// SPMB file upload (5 documents)
const uploadSPMB = multer({
  storage: spmb_storage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Maximum 5 files
  },
}).fields([
  { name: "file_akta_kelahiran", maxCount: 1 },
  { name: "file_kartu_keluarga", maxCount: 1 },
  { name: "file_ijazah", maxCount: 1 },
  { name: "file_skhun", maxCount: 1 },
  { name: "file_foto", maxCount: 1 },
]);

// Article image upload
const uploadArticleImage = multer({
  storage: article_storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
}).single("gambar_utama");

// School logo upload
const uploadSchoolLogo = multer({
  storage: school_storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB
  },
}).single("logo");

// ADDED: Personnel photo upload (3x4 professional photos)
const uploadPersonnelPhoto = multer({
  storage: personnel_storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB for high quality photos
  },
}).single("photo");

// File validation helper
const validateFiles = (files, requiredFiles = []) => {
  const errors = [];

  requiredFiles.forEach((field) => {
    if (!files[field] || files[field].length === 0) {
      errors.push(`File ${field} is required`);
    }
  });

  return errors;
};

// File cleanup helper
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
  return false;
};

module.exports = {
  uploadSPMB,
  uploadArticleImage,
  uploadSchoolLogo,
  uploadPersonnelPhoto, // ADDED export
  validateFiles,
  deleteFile,
};
