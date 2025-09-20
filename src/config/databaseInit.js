// src/config/databaseInit.js - Auto Database Table Creation
const { pool } = require("./database");
const bcrypt = require("bcryptjs");

// Database initialization class
class DatabaseInitializer {
  static async initializeDatabase() {
    console.log("🔧 Initializing database tables...");

    try {
      await this.createAdminUsersTable();
      await this.createJurusanTable();
      await this.createPaymentOptionsTable();
      await this.createSpmBTable();
      await this.createKategoriArtikelTable();
      await this.createArtikelTable();
      await this.createSchoolSettingsTable();
      await this.createEmailTemplatesTable();
      await this.createAcademicCalendarTable();
      await this.createSchoolPersonnelTable(); // NEW: Teachers & Staff table
      await this.createEmailLogsTable(); // NEW: Email logs for better tracking

      // Insert default data
      await this.insertDefaultData();

      console.log("✅ Database initialization completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      return false;
    }
  }

  static async createAdminUsersTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150),
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(200),
        role ENUM('admin', 'operator') DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        can_manage_students BOOLEAN DEFAULT TRUE,
        can_manage_settings BOOLEAN DEFAULT TRUE,
        can_export_data BOOLEAN DEFAULT TRUE,
        can_manage_admins BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ admin_users table ensured");
  }

  static async createJurusanTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS jurusan (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama_jurusan VARCHAR(150) NOT NULL,
        kode_jurusan VARCHAR(20) NOT NULL UNIQUE,
        deskripsi TEXT,
        kuota_siswa INT DEFAULT 36,
        jenjang VARCHAR(10) DEFAULT 'SMK',
        durasi_tahun INT DEFAULT 3,
        urutan_tampil INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_kode_jurusan (kode_jurusan),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ jurusan table ensured");
  }

  static async createPaymentOptionsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS payment_options (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama_pembayaran VARCHAR(150) NOT NULL,
        jumlah_pembayaran DECIMAL(15,2) DEFAULT 0,
        uang_pendaftaran DECIMAL(15,2) DEFAULT 0,
        total_pembayaran DECIMAL(15,2) NOT NULL,
        description TEXT,
        payment_terms TEXT,
        is_recommended BOOLEAN DEFAULT FALSE,
        urutan_tampil INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_is_active (is_active),
        INDEX idx_urutan_tampil (urutan_tampil)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ payment_options table ensured");
  }

  static async createSpmBTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS pendaftar_spmb (
        id INT PRIMARY KEY AUTO_INCREMENT,
        no_pendaftaran VARCHAR(50) NOT NULL UNIQUE,
        pin_login VARCHAR(20) NOT NULL,
        nisn VARCHAR(20),
        nama_lengkap VARCHAR(200) NOT NULL,
        nomor_whatsapp_aktif VARCHAR(20) NOT NULL,
        tempat_lahir VARCHAR(100) NOT NULL,
        tanggal_lahir DATE NOT NULL,
        jenis_kelamin ENUM('Laki-laki', 'Perempuan') NOT NULL,
        golongan_darah ENUM('A', 'B', 'AB', 'O', 'Tidak Tahu'),
        agama ENUM('Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu') NOT NULL,
        status_sekarang VARCHAR(100),
        alamat_siswa TEXT NOT NULL,
        asal_sekolah VARCHAR(200) NOT NULL,
        alamat_sekolah TEXT,
        tahun_lulus YEAR NOT NULL,
        nama_orang_tua VARCHAR(200) NOT NULL,
        nomor_whatsapp_ortu VARCHAR(20),
        pendidikan_orang_tua VARCHAR(100),
        pekerjaan_orang_tua VARCHAR(150) NOT NULL,
        instansi_orang_tua VARCHAR(200),
        penghasilan_orang_tua VARCHAR(100),
        alamat_orang_tua TEXT,
        pilihan_jurusan_id INT,
        pilihan_pembayaran_id INT,
        bukti_pembayaran VARCHAR(500),
        ijazah VARCHAR(500),
        akta_kelahiran VARCHAR(500),
        kartu_keluarga VARCHAR(500),
        pas_foto VARCHAR(500),
        surat_keterangan_lulus VARCHAR(500),
        submitted_ip VARCHAR(45),
        submitted_user_agent TEXT,
        status_pendaftaran ENUM('pending', 'diterima', 'ditolak') DEFAULT 'pending',
        catatan_admin TEXT,
        tanggal_daftar TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bukti_pdf_path VARCHAR(500),
        views INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_no_pendaftaran (no_pendaftaran),
        INDEX idx_pin_login (pin_login),
        INDEX idx_status (status_pendaftaran),
        INDEX idx_tanggal_daftar (tanggal_daftar),
        INDEX idx_jurusan (pilihan_jurusan_id),
        INDEX idx_pembayaran (pilihan_pembayaran_id),
        
        FOREIGN KEY (pilihan_jurusan_id) REFERENCES jurusan(id) ON DELETE SET NULL,
        FOREIGN KEY (pilihan_pembayaran_id) REFERENCES payment_options(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ pendaftar_spmb table ensured");
  }

  static async createKategoriArtikelTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS kategori_artikel (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama_kategori VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        deskripsi TEXT,
        warna_kategori VARCHAR(7) DEFAULT '#3B82F6',
        urutan INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_slug (slug),
        INDEX idx_is_active (is_active),
        INDEX idx_urutan (urutan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ kategori_artikel table ensured");
  }

  static async createArtikelTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS artikel (
        id INT PRIMARY KEY AUTO_INCREMENT,
        judul VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        konten_singkat TEXT,
        konten_lengkap LONGTEXT NOT NULL,
        gambar_utama VARCHAR(500),
        kategori_id INT,
        penulis VARCHAR(200),
        is_published BOOLEAN DEFAULT FALSE,
        tanggal_publish DATE,
        is_featured BOOLEAN DEFAULT FALSE,
        meta_description TEXT,
        tags TEXT,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_slug (slug),
        INDEX idx_published (is_published),
        INDEX idx_featured (is_featured),
        INDEX idx_tanggal_publish (tanggal_publish),
        INDEX idx_kategori (kategori_id),
        
        FOREIGN KEY (kategori_id) REFERENCES kategori_artikel(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ artikel table ensured");
  }

  static async createSchoolSettingsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS school_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_name VARCHAR(200) NOT NULL,
        school_email VARCHAR(150),
        school_phone VARCHAR(50),
        school_address TEXT,
        school_website VARCHAR(200),
        school_logo_path VARCHAR(500),
        smtp_host VARCHAR(100),
        smtp_port INT DEFAULT 587,
        smtp_user VARCHAR(150),
        smtp_password VARCHAR(255),
        smtp_secure BOOLEAN DEFAULT FALSE,
        spmb_open_date DATE,
        spmb_close_date DATE,
        spmb_announcement_date DATE,
        spmb_registration_fee DECIMAL(15,2) DEFAULT 0,
        auto_send_confirmation BOOLEAN DEFAULT TRUE,
        auto_send_status_update BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ school_settings table ensured");
  }

  static async createEmailTemplatesTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        subject VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        type ENUM('spmb', 'notification', 'newsletter') DEFAULT 'notification',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_type (type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ email_templates table ensured");
  }

  static async createAcademicCalendarTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS academic_calendar (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type ENUM('academic', 'exam', 'holiday', 'registration', 'orientation', 'graduation', 'other') DEFAULT 'academic',
        start_date DATE NOT NULL,
        end_date DATE,
        start_time TIME,
        end_time TIME,
        is_all_day BOOLEAN DEFAULT FALSE,
        location VARCHAR(255),
        color VARCHAR(7) DEFAULT '#007bff',
        is_public BOOLEAN DEFAULT TRUE,
        academic_year VARCHAR(10) NOT NULL,
        semester ENUM('ganjil', 'genap', 'both') DEFAULT 'both',
        created_by INT,
        status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
        reminder_days INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_start_date (start_date),
        INDEX idx_academic_year (academic_year),
        INDEX idx_event_type (event_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ academic_calendar table ensured");
  }

  // NEW: School Personnel Table for Teachers & Staff
  static async createSchoolPersonnelTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS school_personnel (
        id INT PRIMARY KEY AUTO_INCREMENT,
        
        -- Basic Information
        full_name VARCHAR(255) NOT NULL,
        photo_path VARCHAR(500) NULL,
        
        -- Position & Role
        position_category ENUM('leadership', 'teacher', 'staff', 'support') NOT NULL,
        position_title VARCHAR(255) NOT NULL,
        department VARCHAR(100) NULL,
        
        -- Teaching Information (for teachers)
        subject_taught VARCHAR(255) NULL,
        teaching_since_year YEAR NULL,
        
        -- Organizational Structure
        hierarchy_level INT DEFAULT 5,
        reports_to INT NULL,
        display_order INT DEFAULT 1,
        
        -- Contact Information
        email VARCHAR(255) NULL,
        phone VARCHAR(20) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Additional Information
        education_background TEXT NULL,
        certifications TEXT NULL,
        bio TEXT NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Indexes for performance
        INDEX idx_category (position_category),
        INDEX idx_hierarchy (hierarchy_level, display_order),
        INDEX idx_active (is_active),
        INDEX idx_teaching_year (teaching_since_year),
        INDEX idx_department (department),
        
        -- Foreign key constraint
        FOREIGN KEY (reports_to) REFERENCES school_personnel(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ school_personnel table ensured");
  }

  // NEW: Email Logs Table for better email tracking
  static async createEmailLogsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
        message_id VARCHAR(255) NULL,
        error_message TEXT NULL,
        registration_id INT NULL,
        template_name VARCHAR(100) NULL,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_recipient (recipient),
        INDEX idx_registration (registration_id),
        INDEX idx_created_at (created_at),
        
        FOREIGN KEY (registration_id) REFERENCES pendaftar_spmb(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await pool.execute(sql);
    console.log("✅ email_logs table ensured");
  }

  static async insertDefaultData() {
    console.log("🔧 Inserting default data...");

    try {
      // Check if admin exists
      const [adminCheck] = await pool.execute("SELECT COUNT(*) as count FROM admin_users WHERE username = ?", ["admin"]);

      if (adminCheck[0].count === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await pool.execute(
          `INSERT INTO admin_users (username, email, password_hash, full_name, role) 
           VALUES (?, ?, ?, ?, ?)`,
          ["admin", "admin@school.com", hashedPassword, "System Administrator", "admin"]
        );
        console.log("✅ Default admin user created (username: admin, password: admin123)");
      }

      // Check if school settings exist
      const [settingsCheck] = await pool.execute("SELECT COUNT(*) as count FROM school_settings WHERE id = 1");

      if (settingsCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO school_settings (id, school_name, school_email, school_phone, school_address) 
           VALUES (1, ?, ?, ?, ?)`,
          ["SMKN 1 Indonesia", "info@smkn1.sch.id", "(021) 1234567", "Jl. Pendidikan No. 123, Jakarta"]
        );
        console.log("✅ Default school settings created");
      }

      // Insert default jurusan
      const [jurusanCheck] = await pool.execute("SELECT COUNT(*) as count FROM jurusan");
      if (jurusanCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO jurusan (nama_jurusan, kode_jurusan, deskripsi, kuota_siswa) VALUES 
           (?, ?, ?, ?), (?, ?, ?, ?)`,
          ["Teknik Komputer dan Jaringan", "TKJ", "Jurusan Teknik Komputer dan Jaringan", 36, "Rekayasa Perangkat Lunak", "RPL", "Jurusan Rekayasa Perangkat Lunak", 36]
        );
        console.log("✅ Default jurusan created");
      }

      // Insert default payment options
      const [paymentCheck] = await pool.execute("SELECT COUNT(*) as count FROM payment_options");
      if (paymentCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO payment_options (nama_pembayaran, total_pembayaran, description, is_recommended) VALUES 
           (?, ?, ?, ?), (?, ?, ?, ?)`,
          ["Pembayaran Lunas", 2500000, "Pembayaran sekaligus dengan diskon", true, "Pembayaran Cicilan 2x", 2600000, "Pembayaran dalam 2 tahap", false]
        );
        console.log("✅ Default payment options created");
      }

      // Insert default categories
      const [categoryCheck] = await pool.execute("SELECT COUNT(*) as count FROM kategori_artikel");
      if (categoryCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO kategori_artikel (nama_kategori, slug, deskripsi, warna_kategori) VALUES 
           (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
          [
            "Pengumuman",
            "pengumuman",
            "Kategori untuk pengumuman sekolah",
            "#dc3545",
            "Kegiatan Sekolah",
            "kegiatan-sekolah",
            "Kategori untuk kegiatan dan acara sekolah",
            "#28a745",
            "Prestasi",
            "prestasi",
            "Kategori untuk prestasi siswa dan sekolah",
            "#ffc107",
          ]
        );
        console.log("✅ Default article categories created");
      }

      // Insert sample article
      const [articleCheck] = await pool.execute("SELECT COUNT(*) as count FROM artikel");
      if (articleCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO artikel (judul, slug, konten_singkat, konten_lengkap, kategori_id, penulis, is_published, tanggal_publish, is_featured) VALUES 
           (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "Selamat Datang di Website Sekolah",
            "selamat-datang-di-website-sekolah",
            "Artikel selamat datang untuk website sekolah yang baru dibuat.",
            "Selamat datang di website resmi sekolah kami. Website ini menyediakan informasi lengkap tentang sekolah, pendaftaran siswa baru, dan berbagai kegiatan sekolah.",
            1, // kategori pengumuman
            "Administrator",
            true,
            new Date().toISOString().split("T")[0],
            true,
          ]
        );
        console.log("✅ Sample article created");
      }

      // Insert sample school personnel
      const [personnelCheck] = await pool.execute("SELECT COUNT(*) as count FROM school_personnel");
      if (personnelCheck[0].count === 0) {
        await pool.execute(
          `INSERT INTO school_personnel (
            full_name, position_category, position_title, department, 
            hierarchy_level, display_order, teaching_since_year, is_active
          ) VALUES 
           (?, ?, ?, ?, ?, ?, ?, ?), 
           (?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "Dr. Ahmad Susanto, S.Pd., M.Pd.",
            "leadership",
            "Kepala Sekolah",
            "Kepemimpinan",
            1,
            1,
            2010,
            true,
            "Siti Nurhaliza, S.Pd.",
            "leadership",
            "Wakil Kepala Sekolah",
            "Kurikulum",
            2,
            1,
            2012,
            true,
            "Budi Santoso, S.Kom.",
            "teacher",
            "Guru Teknik Komputer dan Jaringan",
            "TKJ",
            4,
            1,
            2015,
            true,
          ]
        );
        console.log("✅ Sample school personnel created");
      }

      console.log("✅ Default data insertion completed");
    } catch (error) {
      console.error("❌ Error inserting default data:", error);
    }
  }

  // UPDATED: Enhanced database health check
  static async checkDatabaseHealth() {
    try {
      const tables = [
        "admin_users",
        "jurusan",
        "payment_options",
        "pendaftar_spmb",
        "kategori_artikel",
        "artikel",
        "school_settings",
        "email_templates",
        "academic_calendar",
        "school_personnel", // NEW: Teachers & Staff
        "email_logs", // NEW: Email tracking
      ];

      const results = {};

      for (const table of tables) {
        try {
          const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);

          // Additional info for specific tables
          let additionalInfo = {};

          if (table === "school_personnel") {
            const [categoryBreakdown] = await pool.execute(`
              SELECT position_category, COUNT(*) as count 
              FROM school_personnel 
              WHERE is_active = TRUE 
              GROUP BY position_category
            `);
            additionalInfo.by_category = categoryBreakdown;
          }

          if (table === "pendaftar_spmb") {
            const [statusBreakdown] = await pool.execute(`
              SELECT status_pendaftaran, COUNT(*) as count 
              FROM pendaftar_spmb 
              GROUP BY status_pendaftaran
            `);
            additionalInfo.by_status = statusBreakdown;
          }

          results[table] = {
            exists: true,
            count: rows[0].count,
            status: "healthy",
            ...additionalInfo,
          };
        } catch (error) {
          results[table] = {
            exists: false,
            status: "error",
            error: error.message,
          };
        }
      }

      // Overall health summary
      const totalTables = tables.length;
      const healthyTables = Object.values(results).filter((r) => r.exists).length;
      const healthPercentage = Math.round((healthyTables / totalTables) * 100);

      return {
        summary: {
          total_tables: totalTables,
          healthy_tables: healthyTables,
          health_percentage: healthPercentage,
          status: healthPercentage === 100 ? "excellent" : healthPercentage >= 80 ? "good" : "needs_attention",
        },
        tables: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Database health check failed:", error);
      return {
        summary: {
          status: "failed",
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // NEW: Method to check if specific features are ready
  static async checkFeatureReadiness() {
    try {
      const features = {
        spmb_system: false,
        article_management: false,
        teacher_staff_management: false,
        email_system: false,
        calendar_system: false,
      };

      // Check SPMB system
      const [spmbTables] = await pool.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('pendaftar_spmb', 'jurusan', 'payment_options')
      `);
      features.spmb_system = spmbTables[0].count === 3;

      // Check article management
      const [articleTables] = await pool.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('artikel', 'kategori_artikel')
      `);
      features.article_management = articleTables[0].count === 2;

      // Check teacher/staff management
      const [personnelTables] = await pool.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'school_personnel'
      `);
      features.teacher_staff_management = personnelTables[0].count === 1;

      // Check email system
      const [emailTables] = await pool.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('email_templates', 'email_logs')
      `);
      features.email_system = emailTables[0].count === 2;

      // Check calendar system
      const [calendarTables] = await pool.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'academic_calendar'
      `);
      features.calendar_system = calendarTables[0].count === 1;

      return features;
    } catch (error) {
      console.error("Feature readiness check failed:", error);
      return null;
    }
  }
}

module.exports = DatabaseInitializer;
