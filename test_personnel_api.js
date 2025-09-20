// ============================================================================
// COMPREHENSIVE PERSONNEL API TESTING SCRIPT
// File: test_personnel_api.js
// ============================================================================

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

class PersonnelAPITester {
  constructor(baseURL = "http://localhost:5000", adminCredentials = null) {
    this.baseURL = baseURL;
    this.token = null;
    this.adminCredentials = adminCredentials || {
      username: "admin",
      password: "admin123",
    };
    this.testPersonnelId = null;
    this.testResults = [];
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticate() {
    try {
      console.log("🔐 Authenticating admin user...");

      const response = await axios.post(`${this.baseURL}/api/auth/login`, this.adminCredentials);

      if (response.data.success) {
        this.token = response.data.data.token;
        console.log("✅ Authentication successful");
        console.log(`Token: ${this.token.substring(0, 20)}...`);
        return true;
      } else {
        console.log("❌ Authentication failed:", response.data.message);
        return false;
      }
    } catch (error) {
      console.log("❌ Authentication error:", error.response?.data || error.message);
      return false;
    }
  }

  // Get authorization headers
  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  // ============================================================================
  // TEST METHODS
  // ============================================================================

  async testCreatePersonnel() {
    try {
      console.log("\n📝 Testing CREATE Personnel...");

      const testData = {
        full_name: "Dr. Test Teacher, S.Pd., M.Pd.",
        position_category: "teacher",
        position_title: "Guru Matematika Senior",
        department: "MIPA",
        subject_taught: "Matematika",
        teaching_since_year: 2015,
        hierarchy_level: 4,
        display_order: 1,
        email: "test.teacher@school.edu",
        phone: "081234567890",
        education_background: "S2 Pendidikan Matematika",
        certifications: "Sertifikat Pendidik, Sertifikat Profesi Guru",
        bio: "Guru matematika berpengalaman dengan spesialisasi aljabar dan geometri.",
        is_active: true,
      };

      const response = await axios.post(`${this.baseURL}/api/admin/personnel`, testData, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        this.testPersonnelId = response.data.data.id;
        console.log("✅ CREATE Personnel successful");
        console.log(`Created personnel ID: ${this.testPersonnelId}`);
        this.testResults.push({
          test: "CREATE Personnel",
          status: "PASS",
          details: `Created personnel with ID: ${this.testPersonnelId}`,
        });
        return true;
      } else {
        console.log("❌ CREATE Personnel failed:", response.data.message);
        this.testResults.push({
          test: "CREATE Personnel",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ CREATE Personnel error:", error.response?.data || error.message);
      this.testResults.push({
        test: "CREATE Personnel",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testCreatePersonnelWithPhoto() {
    try {
      console.log("\n📷 Testing CREATE Personnel with Photo...");

      // Create a simple test image file (you can replace this with actual image path)
      const testImagePath = path.join(__dirname, "test-photo.jpg");

      // If test image doesn't exist, create a dummy file
      if (!fs.existsSync(testImagePath)) {
        console.log("⚠️ Test image not found, creating dummy file...");
        fs.writeFileSync(testImagePath, "dummy image content for testing");
      }

      const formData = new FormData();

      // Add personnel data
      formData.append("full_name", "Prof. Photo Test, Ph.D.");
      formData.append("position_category", "leadership");
      formData.append("position_title", "Wakil Kepala Sekolah");
      formData.append("department", "Kurikulum");
      formData.append("hierarchy_level", "2");
      formData.append("display_order", "1");
      formData.append("email", "photo.test@school.edu");
      formData.append("phone", "081234567891");

      // Add photo file
      if (fs.existsSync(testImagePath)) {
        formData.append("photo", fs.createReadStream(testImagePath));
      }

      const response = await axios.post(`${this.baseURL}/api/admin/personnel`, formData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...formData.getHeaders(),
        },
      });

      if (response.data.success) {
        console.log("✅ CREATE Personnel with Photo successful");
        console.log(`Photo path: ${response.data.data.photo_path}`);
        this.testResults.push({
          test: "CREATE Personnel with Photo",
          status: "PASS",
          details: `Created with photo: ${response.data.data.photo_path}`,
        });
        return true;
      } else {
        console.log("❌ CREATE Personnel with Photo failed:", response.data.message);
        this.testResults.push({
          test: "CREATE Personnel with Photo",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ CREATE Personnel with Photo error:", error.response?.data || error.message);
      this.testResults.push({
        test: "CREATE Personnel with Photo",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testGetAllPersonnel() {
    try {
      console.log("\n📋 Testing GET All Personnel...");

      const response = await axios.get(`${this.baseURL}/api/admin/personnel?page=1&limit=10`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        console.log("✅ GET All Personnel successful");
        console.log(`Found ${response.data.data.length} personnel records`);
        console.log(`Pagination: ${response.data.pagination.current_page}/${response.data.pagination.total_pages}`);

        this.testResults.push({
          test: "GET All Personnel",
          status: "PASS",
          details: `Retrieved ${response.data.data.length} records`,
        });
        return true;
      } else {
        console.log("❌ GET All Personnel failed:", response.data.message);
        this.testResults.push({
          test: "GET All Personnel",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ GET All Personnel error:", error.response?.data || error.message);
      this.testResults.push({
        test: "GET All Personnel",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testGetPersonnelById() {
    try {
      console.log("\n🔍 Testing GET Personnel by ID...");

      if (!this.testPersonnelId) {
        console.log("⚠️ No test personnel ID available, skipping test");
        return false;
      }

      const response = await axios.get(`${this.baseURL}/api/admin/personnel/${this.testPersonnelId}`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        console.log("✅ GET Personnel by ID successful");
        console.log(`Personnel: ${response.data.data.full_name}`);
        console.log(`Position: ${response.data.data.position_title}`);
        console.log(`Years of service: ${response.data.data.years_of_service || "N/A"}`);

        this.testResults.push({
          test: "GET Personnel by ID",
          status: "PASS",
          details: `Retrieved ${response.data.data.full_name}`,
        });
        return true;
      } else {
        console.log("❌ GET Personnel by ID failed:", response.data.message);
        this.testResults.push({
          test: "GET Personnel by ID",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ GET Personnel by ID error:", error.response?.data || error.message);
      this.testResults.push({
        test: "GET Personnel by ID",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testUpdatePersonnel() {
    try {
      console.log("\n✏️ Testing UPDATE Personnel...");

      if (!this.testPersonnelId) {
        console.log("⚠️ No test personnel ID available, skipping test");
        return false;
      }

      const updateData = {
        full_name: "Dr. Updated Test Teacher, S.Pd., M.Pd.",
        position_title: "Guru Matematika Expert (Updated)",
        phone: "081234567899",
        bio: "Updated bio: Guru matematika expert dengan pengalaman internasional.",
      };

      const response = await axios.put(`${this.baseURL}/api/admin/personnel/${this.testPersonnelId}`, updateData, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        console.log("✅ UPDATE Personnel successful");
        console.log(`Updated personnel: ${response.data.data.full_name}`);

        this.testResults.push({
          test: "UPDATE Personnel",
          status: "PASS",
          details: `Updated ${response.data.data.full_name}`,
        });
        return true;
      } else {
        console.log("❌ UPDATE Personnel failed:", response.data.message);
        this.testResults.push({
          test: "UPDATE Personnel",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ UPDATE Personnel error:", error.response?.data || error.message);
      this.testResults.push({
        test: "UPDATE Personnel",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testGetPersonnelWithFilters() {
    try {
      console.log("\n🔍 Testing GET Personnel with Filters...");

      // Test filter by category
      const response = await axios.get(`${this.baseURL}/api/admin/personnel?category=teacher&search=Test`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        console.log("✅ GET Personnel with Filters successful");
        console.log(`Found ${response.data.data.length} teacher records with "Test" in name`);
        console.log(`Filters applied: ${JSON.stringify(response.data.filters_applied)}`);

        this.testResults.push({
          test: "GET Personnel with Filters",
          status: "PASS",
          details: `Found ${response.data.data.length} filtered records`,
        });
        return true;
      } else {
        console.log("❌ GET Personnel with Filters failed:", response.data.message);
        this.testResults.push({
          test: "GET Personnel with Filters",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ GET Personnel with Filters error:", error.response?.data || error.message);
      this.testResults.push({
        test: "GET Personnel with Filters",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testGetCategorizedPersonnel() {
    try {
      console.log("\n📊 Testing GET Categorized Personnel...");

      // Test leadership category
      const leadershipResponse = await axios.get(`${this.baseURL}/api/admin/personnel/categories/leadership`, { headers: this.getAuthHeaders() });

      // Test teachers category
      const teachersResponse = await axios.get(`${this.baseURL}/api/admin/personnel/categories/teachers`, { headers: this.getAuthHeaders() });

      // Test staff category
      const staffResponse = await axios.get(`${this.baseURL}/api/admin/personnel/categories/staff`, { headers: this.getAuthHeaders() });

      let allSuccessful = true;
      const results = [];

      if (leadershipResponse.data.success) {
        console.log("✅ Leadership category successful");
        console.log(`Found ${leadershipResponse.data.total} leadership records`);
        results.push(`Leadership: ${leadershipResponse.data.total}`);
      } else {
        allSuccessful = false;
        console.log("❌ Leadership category failed");
      }

      if (teachersResponse.data.success) {
        console.log("✅ Teachers category successful");
        console.log(`Found ${teachersResponse.data.total_teachers} teacher records`);
        results.push(`Teachers: ${teachersResponse.data.total_teachers}`);
      } else {
        allSuccessful = false;
        console.log("❌ Teachers category failed");
      }

      if (staffResponse.data.success) {
        console.log("✅ Staff category successful");
        console.log(`Found ${staffResponse.data.total_staff} staff records`);
        results.push(`Staff: ${staffResponse.data.total_staff}`);
      } else {
        allSuccessful = false;
        console.log("❌ Staff category failed");
      }

      this.testResults.push({
        test: "GET Categorized Personnel",
        status: allSuccessful ? "PASS" : "PARTIAL",
        details: results.join(", "),
      });

      return allSuccessful;
    } catch (error) {
      console.log("❌ GET Categorized Personnel error:", error.response?.data || error.message);
      this.testResults.push({
        test: "GET Categorized Personnel",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testSoftDeletePersonnel() {
    try {
      console.log("\n🗑️ Testing SOFT DELETE Personnel...");

      if (!this.testPersonnelId) {
        console.log("⚠️ No test personnel ID available, skipping test");
        return false;
      }

      const response = await axios.delete(`${this.baseURL}/api/admin/personnel/${this.testPersonnelId}?permanent=false`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        console.log("✅ SOFT DELETE Personnel successful");
        console.log(`Action: ${response.data.data.action}`);
        console.log(`Deactivated: ${response.data.data.name}`);

        this.testResults.push({
          test: "SOFT DELETE Personnel",
          status: "PASS",
          details: `Deactivated ${response.data.data.name}`,
        });
        return true;
      } else {
        console.log("❌ SOFT DELETE Personnel failed:", response.data.message);
        this.testResults.push({
          test: "SOFT DELETE Personnel",
          status: "FAIL",
          details: response.data.message,
        });
        return false;
      }
    } catch (error) {
      console.log("❌ SOFT DELETE Personnel error:", error.response?.data || error.message);
      this.testResults.push({
        test: "SOFT DELETE Personnel",
        status: "ERROR",
        details: error.response?.data?.message || error.message,
      });
      return false;
    }
  }

  async testValidationErrors() {
    try {
      console.log("\n❌ Testing Validation Errors...");

      // Test with invalid data
      const invalidData = {
        full_name: "", // Empty name should fail
        position_category: "invalid_category", // Invalid category
        position_title: "",
        email: "invalid-email", // Invalid email format
        phone: "123", // Invalid phone format
        teaching_since_year: 1900, // Invalid year
      };

      const response = await axios.post(`${this.baseURL}/api/admin/personnel`, invalidData, { headers: this.getAuthHeaders() });

      // This should fail
      console.log("❌ Validation test failed - invalid data was accepted");
      this.testResults.push({
        test: "Validation Errors",
        status: "FAIL",
        details: "Invalid data was unexpectedly accepted",
      });
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        console.log("✅ Validation Errors test successful");
        console.log(`Validation errors caught: ${error.response.data.errors?.length || "multiple"}`);

        this.testResults.push({
          test: "Validation Errors",
          status: "PASS",
          details: "Validation properly rejected invalid data",
        });
        return true;
      } else {
        console.log("❌ Unexpected validation error:", error.response?.data || error.message);
        this.testResults.push({
          test: "Validation Errors",
          status: "ERROR",
          details: error.response?.data?.message || error.message,
        });
        return false;
      }
    }
  }

  async testUnauthorizedAccess() {
    try {
      console.log("\n🔒 Testing Unauthorized Access...");

      // Test without token
      const response = await axios.get(`${this.baseURL}/api/admin/personnel`);

      // This should fail
      console.log("❌ Unauthorized access test failed - access was granted without token");
      this.testResults.push({
        test: "Unauthorized Access",
        status: "FAIL",
        details: "Access granted without authentication",
      });
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("✅ Unauthorized Access test successful");
        console.log("Access properly denied without authentication");

        this.testResults.push({
          test: "Unauthorized Access",
          status: "PASS",
          details: "Access properly denied without token",
        });
        return true;
      } else {
        console.log("❌ Unexpected unauthorized access error:", error.response?.data || error.message);
        this.testResults.push({
          test: "Unauthorized Access",
          status: "ERROR",
          details: error.response?.data?.message || error.message,
        });
        return false;
      }
    }
  }

  // ============================================================================
  // RUN ALL TESTS
  // ============================================================================

  async runAllTests() {
    console.log("🚀 Starting Comprehensive Personnel API Tests...");
    console.log(`Base URL: ${this.baseURL}`);
    console.log("=".repeat(80));

    const startTime = Date.now();

    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log("❌ Cannot proceed without authentication");
      return this.printResults();
    }

    // Step 2: Run all tests
    await this.testCreatePersonnel();
    await this.testCreatePersonnelWithPhoto();
    await this.testGetAllPersonnel();
    await this.testGetPersonnelById();
    await this.testUpdatePersonnel();
    await this.testGetPersonnelWithFilters();
    await this.testGetCategorizedPersonnel();
    await this.testSoftDeletePersonnel();
    await this.testValidationErrors();
    await this.testUnauthorizedAccess();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n" + "=".repeat(80));
    console.log(`✅ All tests completed in ${duration.toFixed(2)} seconds`);

    return this.printResults();
  }

  printResults() {
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(80));

    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const errors = this.testResults.filter((r) => r.status === "ERROR").length;
    const partial = this.testResults.filter((r) => r.status === "PARTIAL").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Errors: ${errors}`);
    console.log(`🔶 Partial: ${partial}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    console.log("\n📋 DETAILED RESULTS:");
    this.testResults.forEach((result, index) => {
      const icon =
        {
          PASS: "✅",
          FAIL: "❌",
          ERROR: "⚠️",
          PARTIAL: "🔶",
        }[result.status] || "❓";

      console.log(`${index + 1}. ${icon} ${result.test}: ${result.details}`);
    });

    const successRate = ((passed / this.testResults.length) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    return {
      passed,
      failed,
      errors,
      partial,
      total: this.testResults.length,
      successRate: parseFloat(successRate),
      results: this.testResults,
    };
  }
}

// ============================================================================
// USAGE EXAMPLE & EXECUTION
// ============================================================================

if (require.main === module) {
  const tester = new PersonnelAPITester();

  tester
    .runAllTests()
    .then((results) => {
      console.log("\n🎉 Testing completed!");

      if (results.successRate >= 80) {
        console.log("🚀 Personnel API is ready for production!");
        process.exit(0);
      } else {
        console.log("⚠️ Personnel API needs fixes before production");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Test execution failed:", error);
      process.exit(1);
    });
}

module.exports = PersonnelAPITester;
