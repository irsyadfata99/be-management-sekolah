// ============================================================================
// Reset Admin Password Script
// File: reset_admin_password.js
// Jalankan dengan: node reset_admin_password.js
// ============================================================================

const bcrypt = require("bcryptjs");
const { pool } = require("./src/config/database");

async function resetAdminPassword() {
  try {
    console.log("🔄 Resetting admin password...");

    // Hash password 'admin123'
    const newPassword = "admin123";
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log("✅ Password hashed successfully");
    console.log("🔑 New hash:", hashedPassword);

    // Update password di database
    const [result] = await pool.execute(
      `
      UPDATE admin_users 
      SET password_hash = ?, 
          updated_at = NOW() 
      WHERE username = 'admin'
    `,
      [hashedPassword]
    );

    if (result.affectedRows > 0) {
      console.log("✅ Admin password updated successfully!");
      console.log("📝 Login credentials:");
      console.log("   Username: admin");
      console.log("   Password: admin123");

      // Verify the update
      const [users] = await pool.execute("SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE username = ?", ["admin"]);

      if (users.length > 0) {
        console.log("✅ Verification successful:");
        console.log("   ID:", users[0].id);
        console.log("   Username:", users[0].username);
        console.log("   Email:", users[0].email);
        console.log("   Full Name:", users[0].full_name);
        console.log("   Role:", users[0].role);
        console.log("   Active:", users[0].is_active);
      }
    } else {
      console.log('❌ No admin user found with username "admin"');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    process.exit(1);
  }
}

resetAdminPassword();
