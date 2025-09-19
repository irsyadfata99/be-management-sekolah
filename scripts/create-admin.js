// FILE: scripts/create-admin.js
// Script to create new admin user

require("dotenv").config();
const { pool } = require("../src/config/database");
const AuthUtils = require("../src/utils/auth");

async function createAdmin() {
  try {
    console.log("🔄 Creating new admin user...");

    // First, check if database connection works
    console.log("📡 Testing database connection...");
    const [testResult] = await pool.execute("SELECT 1 as test");
    console.log("✅ Database connection successful");

    // Check if admin_users table exists
    console.log("🔍 Checking admin_users table structure...");
    const [tableInfo] = await pool.execute("DESCRIBE admin_users");
    console.log(
      "📋 Table columns:",
      tableInfo.map((col) => col.Field).join(", ")
    );

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await AuthUtils.hashPassword("admin123");
    console.log("✅ Password hashed successfully");

    // Insert admin user with all required fields
    console.log("💾 Inserting admin user...");
    const [result] = await pool.execute(
      `INSERT INTO admin_users (
        username, 
        email, 
        password_hash, 
        full_name, 
        role,
        can_manage_students,
        can_manage_settings,
        can_export_data,
        can_manage_admins,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "admin",
        "admin3@smkteknologi.sch.id",
        hashedPassword,
        "Administrator New",
        "admin",
        true, // can_manage_students
        true, // can_manage_settings
        true, // can_export_data
        true, // can_manage_admins
        true, // is_active
      ]
    );

    console.log("✅ Admin user created successfully!");
    console.log("👤 Username: admin");
    console.log("🔑 Password: admin123");
    console.log("🆔 User ID:", result.insertId);

    // Verify the user was created
    console.log("🔍 Verifying user creation...");
    const [verification] = await pool.execute(
      "SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE id = ?",
      [result.insertId]
    );
    console.log("📄 Created user details:", verification[0]);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    console.error("📝 Full error:", error);

    // Additional debugging
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error(
        "🚨 admin_users table doesn't exist. Run database schema first!"
      );
    } else if (error.code === "ER_BAD_FIELD_ERROR") {
      console.error("🚨 Column mismatch. Check table structure!");
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

// Add command line argument support
const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin123";
const email = process.argv[4] || `${username}@smkteknologi.sch.id`;

console.log(`🚀 Creating admin user: ${username}`);
createAdmin();
