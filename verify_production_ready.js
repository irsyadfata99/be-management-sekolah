// ============================================================================
// PRODUCTION VERIFICATION SCRIPT
// File: verify_production_ready.js
// ============================================================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");

class ProductionVerifier {
  constructor(baseURL = "http://localhost:5000") {
    this.baseURL = baseURL;
    this.token = null;
    this.checks = [];
  }

  log(status, message, details = "") {
    const icon =
      { PASS: "✅", FAIL: "❌", WARN: "⚠️", INFO: "ℹ️" }[status] || "🔵";
    console.log(`${icon} ${message}${details ? ` - ${details}` : ""}`);
    this.checks.push({ status, message, details });
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        username: "admin",
        password: "admin123",
      });

      if (response.data.success) {
        this.token = response.data.data.token;
        this.log("PASS", "Authentication successful");
        return true;
      } else {
        this.log("FAIL", "Authentication failed", response.data.message);
        return false;
      }
    } catch (error) {
      this.log(
        "FAIL",
        "Authentication error",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async verifyServerHealth() {
    try {
      console.log("\n🏥 CHECKING SERVER HEALTH...");

      const response = await axios.get(`${this.baseURL}/api/health`);
      if (response.data.success) {
        this.log(
          "PASS",
          "Server health check",
          `Version: ${response.data.version}`
        );
        return true;
      } else {
        this.log("FAIL", "Server health check failed");
        return false;
      }
    } catch (error) {
      this.log("FAIL", "Server not responding", error.message);
      return false;
    }
  }

  async verifyDatabaseHealth() {
    try {
      console.log("\n🗄️ CHECKING DATABASE...");

      const response = await axios.get(`${this.baseURL}/api/health/database`);
      if (response.data.success) {
        const dbInfo = response.data.database_info;
        this.log(
          "PASS",
          "Database connected",
          `${dbInfo.total_tables} tables, Status: ${dbInfo.status}`
        );

        if (dbInfo.missing_tables.length > 0) {
          this.log("WARN", "Missing tables", dbInfo.missing_tables.join(", "));
        }

        return dbInfo.status === "ready";
      } else {
        this.log("FAIL", "Database health check failed");
        return false;
      }
    } catch (error) {
      this.log(
        "FAIL",
        "Database check error",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async verifyPersonnelTable() {
    try {
      console.log("\n👥 CHECKING PERSONNEL TABLE...");

      if (!this.token) {
        this.log("FAIL", "No authentication token");
        return false;
      }

      const response = await axios.get(
        `${this.baseURL}/api/admin/personnel?limit=1`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );

      if (response.data.success) {
        this.log(
          "PASS",
          "Personnel table accessible",
          `Total records: ${response.data.pagination.total_records}`
        );
        return true;
      } else {
        this.log("FAIL", "Personnel table check failed", response.data.message);
        return false;
      }
    } catch (error) {
      this.log(
        "FAIL",
        "Personnel table error",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async verifyPersonnelEndpoints() {
    try {
      console.log("\n🔗 CHECKING PERSONNEL ENDPOINTS...");

      if (!this.token) {
        this.log("FAIL", "No authentication token");
        return false;
      }

      const headers = { Authorization: `Bearer ${this.token}` };
      const endpoints = [
        { url: "/api/admin/personnel", method: "GET", name: "List Personnel" },
        {
          url: "/api/admin/personnel/categories/leadership",
          method: "GET",
          name: "Leadership Category",
        },
        {
          url: "/api/admin/personnel/categories/teachers",
          method: "GET",
          name: "Teachers Category",
        },
        {
          url: "/api/admin/personnel/categories/staff",
          method: "GET",
          name: "Staff Category",
        },
      ];

      let allPassed = true;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint.url}`, {
            headers,
          });
          if (response.data.success) {
            this.log("PASS", `${endpoint.name} endpoint working`);
          } else {
            this.log(
              "FAIL",
              `${endpoint.name} endpoint failed`,
              response.data.message
            );
            allPassed = false;
          }
        } catch (error) {
          this.log(
            "FAIL",
            `${endpoint.name} endpoint error`,
            error.response?.data?.message || error.message
          );
          allPassed = false;
        }
      }

      return allPassed;
    } catch (error) {
      this.log("FAIL", "Personnel endpoints check error", error.message);
      return false;
    }
  }

  async verifyUploadDirectories() {
    try {
      console.log("\n📁 CHECKING UPLOAD DIRECTORIES...");

      const requiredDirs = [
        "uploads/spmb",
        "uploads/articles",
        "uploads/school",
        "uploads/temp",
        "uploads/personnel",
      ];

      let allExist = true;

      for (const dir of requiredDirs) {
        if (fs.existsSync(dir)) {
          this.log("PASS", `Directory exists: ${dir}`);
        } else {
          this.log("FAIL", `Directory missing: ${dir}`);
          allExist = false;
        }
      }

      // Check write permissions
      const testFile = path.join("uploads/personnel", "test-write.txt");
      try {
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        this.log("PASS", "Personnel directory writable");
      } catch (error) {
        this.log("FAIL", "Personnel directory not writable", error.message);
        allExist = false;
      }

      return allExist;
    } catch (error) {
      this.log("FAIL", "Upload directories check error", error.message);
      return false;
    }
  }

  async testPhotoUpload() {
    try {
      console.log("\n📸 TESTING PHOTO UPLOAD...");

      if (!this.token) {
        this.log("FAIL", "No authentication token");
        return false;
      }

      // Create a dummy image file for testing
      const testImagePath = path.join(__dirname, "test-photo.jpg");

      // Create minimal dummy file if doesn't exist
      if (!fs.existsSync(testImagePath)) {
        fs.writeFileSync(
          testImagePath,
          Buffer.from("dummy image content for testing")
        );
      }

      const FormData = require("form-data");
      const formData = new FormData();

      formData.append("full_name", "Test Photo Upload");
      formData.append("position_category", "teacher");
      formData.append("position_title", "Test Position");
      formData.append("photo", fs.createReadStream(testImagePath));

      const response = await axios.post(
        `${this.baseURL}/api/admin/personnel`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...formData.getHeaders(),
          },
        }
      );

      if (response.data.success) {
        const personnelId = response.data.data.id;
        this.log(
          "PASS",
          "Photo upload test successful",
          `Created personnel ID: ${personnelId}`
        );

        // Clean up test data
        try {
          await axios.delete(
            `${this.baseURL}/api/admin/personnel/${personnelId}?permanent=true`,
            {
              headers: { Authorization: `Bearer ${this.token}` },
            }
          );
          this.log("INFO", "Test data cleaned up");
        } catch (cleanupError) {
          this.log(
            "WARN",
            "Test data cleanup failed",
            "Manual cleanup may be needed"
          );
        }

        // Clean up test file
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }

        return true;
      } else {
        this.log("FAIL", "Photo upload test failed", response.data.message);
        return false;
      }
    } catch (error) {
      this.log(
        "FAIL",
        "Photo upload test error",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async verifyAuthentication() {
    try {
      console.log("\n🔐 CHECKING AUTHENTICATION...");

      // Test unauthorized access
      try {
        await axios.get(`${this.baseURL}/api/admin/personnel`);
        this.log("FAIL", "Unauthorized access allowed");
        return false;
      } catch (error) {
        if (error.response?.status === 401) {
          this.log("PASS", "Unauthorized access properly blocked");
        } else {
          this.log("WARN", "Unexpected auth response", error.response?.status);
        }
      }

      // Test authorized access
      if (this.token) {
        const response = await axios.get(
          `${this.baseURL}/api/admin/personnel`,
          {
            headers: { Authorization: `Bearer ${this.token}` },
          }
        );

        if (response.data.success) {
          this.log("PASS", "Authorized access working");
          return true;
        } else {
          this.log("FAIL", "Authorized access failed");
          return false;
        }
      }

      return false;
    } catch (error) {
      this.log("FAIL", "Authentication check error", error.message);
      return false;
    }
  }

  async runProductionCheck() {
    console.log("🚀 STARTING PRODUCTION READINESS VERIFICATION");
    console.log("=" * 60);

    const startTime = Date.now();

    // Step 1: Server Health
    const serverOk = await this.verifyServerHealth();
    if (!serverOk) {
      console.log("\n❌ CRITICAL: Server not responding. Cannot continue.");
      return this.printSummary();
    }

    // Step 2: Database Health
    const dbOk = await this.verifyDatabaseHealth();
    if (!dbOk) {
      console.log("\n❌ CRITICAL: Database issues detected. Cannot continue.");
      return this.printSummary();
    }

    // Step 3: Authentication
    const authOk = await this.authenticate();
    if (!authOk) {
      console.log("\n❌ CRITICAL: Authentication failed. Cannot continue.");
      return this.printSummary();
    }

    // Step 4: Upload Directories
    await this.verifyUploadDirectories();

    // Step 5: Personnel Table
    await this.verifyPersonnelTable();

    // Step 6: Personnel Endpoints
    await this.verifyPersonnelEndpoints();

    // Step 7: Authentication Security
    await this.verifyAuthentication();

    // Step 8: Photo Upload Test
    await this.testPhotoUpload();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `\n⏱️ Verification completed in ${duration.toFixed(2)} seconds`
    );

    return this.printSummary();
  }

  printSummary() {
    console.log("\n" + "=" * 60);
    console.log("📊 PRODUCTION READINESS SUMMARY");
    console.log("=" * 60);

    const passed = this.checks.filter((c) => c.status === "PASS").length;
    const failed = this.checks.filter((c) => c.status === "FAIL").length;
    const warnings = this.checks.filter((c) => c.status === "WARN").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📊 Total Checks: ${this.checks.length}`);

    const successRate = ((passed / this.checks.length) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);

    console.log("\n📋 DETAILED RESULTS:");
    this.checks.forEach((check, index) => {
      const icon =
        { PASS: "✅", FAIL: "❌", WARN: "⚠️", INFO: "ℹ️" }[check.status] ||
        "🔵";
      console.log(
        `${index + 1}. ${icon} ${check.message}${
          check.details ? ` - ${check.details}` : ""
        }`
      );
    });

    if (failed === 0 && successRate >= 90) {
      console.log("\n🎉 PRODUCTION READY! 🚀");
      console.log("Your Personnel CRUD system is ready for production use.");
      console.log("\n📝 Next Steps:");
      console.log("1. Deploy to production server");
      console.log("2. Set up production database");
      console.log("3. Configure production environment variables");
      console.log("4. Set up SSL/HTTPS");
      console.log("5. Configure domain and DNS");
      console.log("6. Start building frontend interface");
    } else {
      console.log("\n⚠️ NEEDS ATTENTION");
      console.log(
        "Some issues need to be resolved before production deployment."
      );
      console.log("\n🔧 Action Required:");
      this.checks
        .filter((c) => c.status === "FAIL")
        .forEach((check) => {
          console.log(`- Fix: ${check.message}`);
        });
    }

    return {
      passed,
      failed,
      warnings,
      total: this.checks.length,
      successRate: parseFloat(successRate),
      ready: failed === 0 && successRate >= 90,
    };
  }
}

// ============================================================================
// USAGE & EXECUTION
// ============================================================================

if (require.main === module) {
  const verifier = new ProductionVerifier();

  verifier
    .runProductionCheck()
    .then((results) => {
      if (results.ready) {
        console.log("\n🎯 Personnel CRUD System: PRODUCTION READY!");
        process.exit(0);
      } else {
        console.log("\n🔧 Personnel CRUD System: NEEDS FIXES");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Verification failed:", error);
      process.exit(1);
    });
}

module.exports = ProductionVerifier;
