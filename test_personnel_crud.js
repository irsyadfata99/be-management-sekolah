// ============================================================================
// TESTING SCRIPT - test_personnel_crud.js
// Run with: node test_personnel_crud.js
// ============================================================================

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const BASE_URL = "http://localhost:5000/api";
let authToken = "";

// Test Configuration
const testConfig = {
  adminCredentials: {
    username: "admin",
    password: "admin123",
  },
  testPersonnel: {
    full_name: "Test Guru Matematika, S.Pd.",
    position_category: "teacher",
    position_title: "Guru Matematika",
    department: "Akademik",
    subject_taught: "Matematika",
    teaching_since_year: 2020,
    hierarchy_level: 4,
    email: "test.guru@sekolah.ac.id",
    phone: "081234567999",
    bio: "Guru matematika test untuk development",
  },
};

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}
