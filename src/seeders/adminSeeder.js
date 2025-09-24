const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

async function seedAdminUsers() {
  try {
    // Check if admin already exists
    const [existingAdmins] = await pool.execute(
      "SELECT COUNT(*) as count FROM admins WHERE username = ?",
      ["admin"]
    );

    if (existingAdmins[0].count === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 12);

      await pool.execute(
        `
        INSERT INTO admins (username, password, full_name, role, status) 
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          "admin",
          hashedPassword,
          "System Administrator",
          "super_admin",
          "active",
        ]
      );

      console.log("✅ Default admin user created");
      console.log("Username: admin");
      console.log("Password: admin123");
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Admin seeder error:", error);
  }
}

module.exports = { seedAdminUsers };
