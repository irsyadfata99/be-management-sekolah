const mysql = require("mysql2/promise");

// CLEAN configuration - no deprecated options
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sekolah_db",
  charset: "utf8mb4",
  timezone: "+00:00",

  // Only valid MySQL2 options
  connectionLimit: 25,
  queueLimit: 50,
  multipleStatements: false,
};

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected successfully");
    console.log(
      `Connected to: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`
    );
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  }
};

module.exports = { pool, testConnection };
