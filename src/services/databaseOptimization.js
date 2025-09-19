// src/services/databaseOptimization.js - Database Optimization & Monitoring
const { pool } = require("../config/database");

class DatabaseOptimization {
  constructor() {
    this.slowQueryThreshold = 1000; // 1 second
    this.queryStats = new Map();
    this.initializeOptimizations();
  }

  // Initialize database optimizations on startup
  async initializeOptimizations() {
    try {
      console.log("🔧 Initializing database optimizations...");

      await this.createOptimalIndexes();
      await this.optimizeConnectionPool();
      await this.enableQueryCaching();
      await this.createPerformanceViews();

      console.log("✅ Database optimizations completed");
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
    }
  }

  // Create optimal indexes for better query performance
  async createOptimalIndexes() {
    const indexes = [
      // SPMB Registrations indexes
      {
        table: "pendaftar_spmb",
        name: "idx_spmb_composite_search",
        columns: "status_pendaftaran, tanggal_daftar, pilihan_jurusan_id",
        type: "BTREE",
      },
      {
        table: "pendaftar_spmb",
        name: "idx_spmb_no_pin",
        columns: "no_pendaftaran, pin_login",
        type: "BTREE",
      },
      {
        table: "pendaftar_spmb",
        name: "idx_spmb_whatsapp",
        columns: "nomor_whatsapp_aktif",
        type: "BTREE",
      },

      // Email logs indexes
      {
        table: "email_logs",
        name: "idx_email_composite",
        columns: "status, type, created_at",
        type: "BTREE",
      },
      {
        table: "email_logs",
        name: "idx_email_registration",
        columns: "registration_id, status",
        type: "BTREE",
      },

      // Academic calendar indexes
      {
        table: "academic_calendar",
        name: "idx_calendar_date_range",
        columns: "start_date, end_date, status",
        type: "BTREE",
      },
      {
        table: "academic_calendar",
        name: "idx_calendar_academic_year",
        columns: "academic_year, semester, event_type",
        type: "BTREE",
      },

      // School settings indexes
      {
        table: "school_settings",
        name: "idx_settings_updated",
        columns: "updated_at",
        type: "BTREE",
      },
    ];

    for (const index of indexes) {
      try {
        // Check if index exists
        const [existingIndexes] = await pool.execute(
          `
          SELECT COUNT(*) as count
          FROM information_schema.STATISTICS 
          WHERE table_schema = DATABASE() 
          AND table_name = ? 
          AND index_name = ?
        `,
          [index.table, index.name]
        );

        if (existingIndexes[0].count === 0) {
          const createIndexQuery = `
            CREATE INDEX ${index.name} 
            ON ${index.table} (${index.columns}) 
            USING ${index.type}
          `;

          await pool.execute(createIndexQuery);
          console.log(`✅ Created index: ${index.name} on ${index.table}`);
        } else {
          console.log(
            `ℹ️ Index already exists: ${index.name} on ${index.table}`
          );
        }
      } catch (error) {
        if (error.code !== "ER_DUP_KEYNAME") {
          console.error(
            `❌ Failed to create index ${index.name}:`,
            error.message
          );
        }
      }
    }
  }

  // Optimize MySQL connection pool settings
  async optimizeConnectionPool() {
    try {
      const optimizations = [
        "SET SESSION query_cache_type = ON",
        "SET SESSION sort_buffer_size = 2097152", // 2MB
        "SET SESSION read_buffer_size = 131072", // 128KB
        "SET SESSION max_heap_table_size = 16777216", // 16MB
      ];

      for (const query of optimizations) {
        try {
          await pool.execute(query);
        } catch (error) {
          console.log(`ℹ️ Optimization not applied: ${query.split(" ")[2]}`);
        }
      }

      console.log("✅ Connection pool optimizations applied");
    } catch (error) {
      console.error("❌ Connection pool optimization failed:", error);
    }
  }

  // Enable query caching where possible
  async enableQueryCaching() {
    try {
      // Set query cache for frequently used queries
      await pool.execute("SET SESSION query_cache_type = ON");
      console.log("✅ Query caching enabled");
    } catch (error) {
      console.log("ℹ️ Query caching not available on this MySQL version");
    }
  }

  // Create performance monitoring views
  async createPerformanceViews() {
    try {
      // Create view for registration statistics
      await pool.execute(`
        CREATE OR REPLACE VIEW v_registration_stats AS
        SELECT 
          DATE(tanggal_daftar) as date,
          status_pendaftaran,
          j.nama_jurusan,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(HOUR, tanggal_daftar, p.updated_at)) as avg_processing_hours
        FROM pendaftar_spmb p
        LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
        GROUP BY DATE(tanggal_daftar), status_pendaftaran, j.nama_jurusan
      `);

      // Create view for email performance
      await pool.execute(`
        CREATE OR REPLACE VIEW v_email_performance AS
        SELECT 
          DATE(created_at) as date,
          type,
          status,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(SECOND, created_at, COALESCE(sent_at, created_at))) as avg_send_time
        FROM email_logs
        GROUP BY DATE(created_at), type, status
      `);

      console.log("✅ Performance views created");
    } catch (error) {
      console.error("❌ Failed to create performance views:", error);
    }
  }

  // Monitor query performance
  async monitorQuery(queryName, queryFunction) {
    const startTime = Date.now();

    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;

      // Track query statistics
      if (!this.queryStats.has(queryName)) {
        this.queryStats.set(queryName, {
          totalExecutions: 0,
          totalTime: 0,
          slowQueries: 0,
          lastExecution: null,
        });
      }

      const stats = this.queryStats.get(queryName);
      stats.totalExecutions++;
      stats.totalTime += executionTime;
      stats.lastExecution = new Date();

      if (executionTime > this.slowQueryThreshold) {
        stats.slowQueries++;
        console.warn(
          `🐌 Slow query detected: ${queryName} took ${executionTime}ms`
        );
      }

      this.queryStats.set(queryName, stats);

      return result;
    } catch (error) {
      console.error(`❌ Query error in ${queryName}:`, error);
      throw error;
    }
  }

  // Get query performance statistics
  getQueryStats() {
    const stats = {};

    for (const [queryName, data] of this.queryStats.entries()) {
      stats[queryName] = {
        ...data,
        avgExecutionTime:
          data.totalExecutions > 0 ? data.totalTime / data.totalExecutions : 0,
        slowQueryPercentage:
          data.totalExecutions > 0
            ? (data.slowQueries / data.totalExecutions) * 100
            : 0,
      };
    }

    return stats;
  }

  // Analyze table sizes and suggest optimizations
  async analyzeTableSizes() {
    try {
      const [tables] = await pool.execute(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          data_length + index_length AS total_size,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS total_size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY (data_length + index_length) DESC
      `);

      const analysis = {
        tables: tables,
        recommendations: [],
      };

      // Generate recommendations
      tables.forEach((table) => {
        if (table.total_size_mb > 100) {
          analysis.recommendations.push({
            table: table.table_name,
            type: "large_table",
            message: `Table ${table.table_name} is ${table.total_size_mb}MB. Consider archiving old data.`,
          });
        }

        if (table.index_length > table.data_length * 2) {
          analysis.recommendations.push({
            table: table.table_name,
            type: "index_heavy",
            message: `Table ${table.table_name} has more index data than actual data. Review index necessity.`,
          });
        }
      });

      return analysis;
    } catch (error) {
      console.error("❌ Table analysis failed:", error);
      throw error;
    }
  }

  // Optimize specific table
  async optimizeTable(tableName) {
    try {
      console.log(`🔧 Optimizing table: ${tableName}`);

      // Analyze table
      await pool.execute(`ANALYZE TABLE ${tableName}`);

      // Optimize table
      const [result] = await pool.execute(`OPTIMIZE TABLE ${tableName}`);

      console.log(`✅ Table ${tableName} optimized:`, result[0]);
      return result[0];
    } catch (error) {
      console.error(`❌ Failed to optimize table ${tableName}:`, error);
      throw error;
    }
  }

  // Clean up old data
  async cleanupOldData() {
    try {
      const cleanupTasks = [];

      // Clean old email logs (older than 90 days)
      const emailCleanup = await pool.execute(`
        DELETE FROM email_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        AND status = 'sent'
      `);

      if (emailCleanup[0].affectedRows > 0) {
        cleanupTasks.push({
          task: "email_logs_cleanup",
          deleted_rows: emailCleanup[0].affectedRows,
        });
      }

      // Clean old completed calendar events (older than 1 year)
      const calendarCleanup = await pool.execute(`
        DELETE FROM academic_calendar 
        WHERE end_date < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        AND status = 'completed'
      `);

      if (calendarCleanup[0].affectedRows > 0) {
        cleanupTasks.push({
          task: "calendar_cleanup",
          deleted_rows: calendarCleanup[0].affectedRows,
        });
      }

      console.log("✅ Data cleanup completed:", cleanupTasks);
      return cleanupTasks;
    } catch (error) {
      console.error("❌ Data cleanup failed:", error);
      throw error;
    }
  }

  // Get database health metrics
  async getDatabaseHealth() {
    try {
      // Get connection info
      const [processlist] = await pool.execute("SHOW PROCESSLIST");

      // Get table status
      const [tableStatus] = await pool.execute(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      // Get database size
      const [dbSize] = await pool.execute(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS db_size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      // Get slow queries (if available)
      let slowQueries = { count: 0 };
      try {
        const [slowQueryResult] = await pool.execute(`
          SELECT COUNT(*) as count
          FROM mysql.slow_log
          WHERE start_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);
        slowQueries = slowQueryResult[0];
      } catch (e) {
        // Slow query log might not be enabled
      }

      return {
        connections: {
          active: processlist.length,
          details: processlist.map((proc) => ({
            id: proc.Id,
            user: proc.User,
            host: proc.Host,
            db: proc.db,
            command: proc.Command,
            time: proc.Time,
            state: proc.State,
          })),
        },
        database: {
          table_count: tableStatus[0].table_count,
          size_mb: dbSize[0].db_size_mb,
        },
        performance: {
          slow_queries_24h: slowQueries.count,
          query_stats: this.getQueryStats(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      throw error;
    }
  }

  // Schedule automatic optimizations
  scheduleOptimizations() {
    // Run table optimization daily at 2 AM
    setInterval(async () => {
      const hour = new Date().getHours();
      if (hour === 2) {
        console.log("🔧 Running scheduled database optimization...");
        try {
          await this.optimizeTable("pendaftar_spmb");
          await this.optimizeTable("email_logs");
          await this.cleanupOldData();
          console.log("✅ Scheduled optimization completed");
        } catch (error) {
          console.error("❌ Scheduled optimization failed:", error);
        }
      }
    }, 3600000); // Check every hour

    // Clear query stats weekly
    setInterval(() => {
      console.log("🔄 Clearing query statistics...");
      this.queryStats.clear();
    }, 7 * 24 * 3600000); // Every 7 days

    console.log("⏰ Database optimization scheduler started");
  }

  // Backup critical tables
  async backupCriticalTables() {
    try {
      const tables = ["school_settings", "jurusan", "payment_options"];
      const backups = [];

      for (const table of tables) {
        // Create backup table name with timestamp
        const timestamp = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");
        const backupTableName = `${table}_backup_${timestamp}`;

        // Drop existing backup if exists
        await pool.execute(`DROP TABLE IF EXISTS ${backupTableName}`);

        // Create backup
        await pool.execute(
          `CREATE TABLE ${backupTableName} AS SELECT * FROM ${table}`
        );

        const [count] = await pool.execute(
          `SELECT COUNT(*) as count FROM ${backupTableName}`
        );

        backups.push({
          original_table: table,
          backup_table: backupTableName,
          rows_backed_up: count[0].count,
          created_at: new Date().toISOString(),
        });

        console.log(
          `✅ Backed up ${table} to ${backupTableName} (${count[0].count} rows)`
        );
      }

      return backups;
    } catch (error) {
      console.error("❌ Critical table backup failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseOptimization();
