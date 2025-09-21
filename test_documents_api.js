const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

class DocumentsAPITester {
  constructor(baseURL = "http://localhost:5000") {
    this.baseURL = baseURL;
    this.token = null;
    this.testDocumentId = null;
    this.testResults = [];
  }

  async authenticate() {
    try {
      console.log("🔐 Authenticating admin user...");
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        username: "admin",
        password: "admin123",
      });

      if (response.data.success) {
        this.token = response.data.data.token;
        console.log("✅ Authentication successful");
        return true;
      }
      return false;
    } catch (error) {
      console.log("❌ Authentication failed:", error.response?.data?.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async testAdminDocumentsList() {
    try {
      console.log("\n📋 Testing Admin Documents List...");
      const response = await axios.get(`${this.baseURL}/api/admin/documents`, {
        headers: this.getAuthHeaders(),
      });

      if (response.data.success) {
        console.log(`✅ Found ${response.data.data.length} documents`);
        this.testResults.push({ test: "Admin Documents List", status: "PASS" });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Admin documents list failed:",
        error.response?.data?.message
      );
      this.testResults.push({ test: "Admin Documents List", status: "FAIL" });
      return false;
    }
  }

  async testAdminDocumentUpload() {
    try {
      console.log("\n📤 Testing Admin Document Upload...");

      // Create test PDF file
      const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000441 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
553
%%EOF`;

      const testFilePath = path.join(__dirname, "test-document.pdf");
      fs.writeFileSync(testFilePath, testContent);

      const formData = new FormData();
      formData.append("title", "Test Document Upload");
      formData.append("description", "This is a test document for API testing");
      formData.append("category", "pengumuman");
      formData.append("upload_date", new Date().toISOString().split("T")[0]);
      formData.append("tags", "test, upload, api");
      formData.append("keywords", "test document upload");
      formData.append("is_featured", "false");
      formData.append("requires_login", "false");
      formData.append("auto_approve", "true");
      formData.append("document", fs.createReadStream(testFilePath));

      const response = await axios.post(
        `${this.baseURL}/api/admin/documents`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...formData.getHeaders(),
          },
        }
      );

      // Clean up test file
      fs.unlinkSync(testFilePath);

      if (response.data.success) {
        this.testDocumentId = response.data.data.id;
        console.log(
          `✅ Document uploaded successfully, ID: ${this.testDocumentId}`
        );
        this.testResults.push({
          test: "Admin Document Upload",
          status: "PASS",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Admin document upload failed:",
        error.response?.data?.message
      );
      this.testResults.push({ test: "Admin Document Upload", status: "FAIL" });
      return false;
    }
  }

  async testPublicDocumentsList() {
    try {
      console.log("\n📋 Testing Public Documents List...");
      const response = await axios.get(`${this.baseURL}/api/public/documents`);

      if (response.data.success) {
        console.log(`✅ Found ${response.data.data.length} public documents`);
        this.testResults.push({
          test: "Public Documents List",
          status: "PASS",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Public documents list failed:",
        error.response?.data?.message
      );
      this.testResults.push({ test: "Public Documents List", status: "FAIL" });
      return false;
    }
  }

  async testPublicDocumentCategories() {
    try {
      console.log("\n📁 Testing Public Document Categories...");
      const response = await axios.get(
        `${this.baseURL}/api/public/documents/categories`
      );

      if (response.data.success) {
        console.log(`✅ Found ${response.data.data.length} categories`);
        this.testResults.push({
          test: "Public Document Categories",
          status: "PASS",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Public document categories failed:",
        error.response?.data?.message
      );
      this.testResults.push({
        test: "Public Document Categories",
        status: "FAIL",
      });
      return false;
    }
  }

  async testPublicDocumentDownload() {
    try {
      console.log("\n📥 Testing Public Document Download...");

      if (!this.testDocumentId) {
        console.log("⚠️ No test document ID available, skipping download test");
        return false;
      }

      const response = await axios.get(
        `${this.baseURL}/api/public/documents/download/${this.testDocumentId}`,
        {
          responseType: "stream",
        }
      );

      if (response.status === 200) {
        console.log(`✅ Document download successful`);
        this.testResults.push({
          test: "Public Document Download",
          status: "PASS",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Public document download failed:",
        error.response?.data?.message
      );
      this.testResults.push({
        test: "Public Document Download",
        status: "FAIL",
      });
      return false;
    }
  }

  async testDocumentInfo() {
    try {
      console.log("\n📊 Testing Document Info...");

      if (!this.testDocumentId) {
        console.log("⚠️ No test document ID available, skipping info test");
        return false;
      }

      const response = await axios.get(
        `${this.baseURL}/api/public/documents/info/${this.testDocumentId}`
      );

      if (response.data.success) {
        console.log(`✅ Document info retrieved: ${response.data.data.title}`);
        this.testResults.push({ test: "Document Info", status: "PASS" });
        return true;
      }
      return false;
    } catch (error) {
      console.log("❌ Document info failed:", error.response?.data?.message);
      this.testResults.push({ test: "Document Info", status: "FAIL" });
      return false;
    }
  }

  async testDocumentStats() {
    try {
      console.log("\n📈 Testing Document Statistics...");
      const response = await axios.get(
        `${this.baseURL}/api/public/documents/stats`
      );

      if (response.data.success) {
        const stats = response.data.data.overview;
        console.log(
          `✅ Stats: ${stats.total_documents} docs, ${stats.total_downloads} downloads`
        );
        this.testResults.push({ test: "Document Statistics", status: "PASS" });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Document statistics failed:",
        error.response?.data?.message
      );
      this.testResults.push({ test: "Document Statistics", status: "FAIL" });
      return false;
    }
  }

  async testAdminDocumentUpdate() {
    try {
      console.log("\n✏️ Testing Admin Document Update...");

      if (!this.testDocumentId) {
        console.log("⚠️ No test document ID available, skipping update test");
        return false;
      }

      const updateData = {
        title: "Updated Test Document",
        description: "This document has been updated via API test",
        is_featured: true,
      };

      const response = await axios.put(
        `${this.baseURL}/api/admin/documents/${this.testDocumentId}`,
        updateData,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (response.data.success) {
        console.log(`✅ Document updated successfully`);
        this.testResults.push({
          test: "Admin Document Update",
          status: "PASS",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log(
        "❌ Admin document update failed:",
        error.response?.data?.message
      );
      this.testResults.push({ test: "Admin Document Update", status: "FAIL" });
      return false;
    }
  }

  async cleanupTestData() {
    try {
      console.log("\n🧹 Cleaning up test data...");

      if (this.testDocumentId) {
        await axios.delete(
          `${this.baseURL}/api/admin/documents/${this.testDocumentId}?permanent=true`,
          {
            headers: this.getAuthHeaders(),
          }
        );
        console.log("✅ Test document deleted");
      }
    } catch (error) {
      console.log("⚠️ Cleanup warning:", error.response?.data?.message);
    }
  }

  async runAllTests() {
    console.log("🚀 Starting Comprehensive Documents API Tests...");
    console.log("=".repeat(60));

    const startTime = Date.now();

    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log("❌ Cannot proceed without authentication");
      return this.printResults();
    }

    // Step 2: Run all tests
    await this.testAdminDocumentsList();
    await this.testAdminDocumentUpload();
    await this.testPublicDocumentsList();
    await this.testPublicDocumentCategories();
    await this.testDocumentInfo();
    await this.testPublicDocumentDownload();
    await this.testDocumentStats();
    await this.testAdminDocumentUpdate();

    // Step 3: Cleanup
    await this.cleanupTestData();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n⏱️ All tests completed in ${duration.toFixed(2)} seconds`);

    return this.printResults();
  }

  printResults() {
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(60));

    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    console.log("\n📋 DETAILED RESULTS:");
    this.testResults.forEach((result, index) => {
      const icon = result.status === "PASS" ? "✅" : "❌";
      console.log(`${index + 1}. ${icon} ${result.test}`);
    });

    const successRate = ((passed / this.testResults.length) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (successRate >= 90) {
      console.log("\n🎉 PUBLIC DOCUMENTS SYSTEM IS PRODUCTION READY! 🚀");
    } else {
      console.log(
        "\n⚠️ Some issues need to be resolved before production deployment."
      );
    }

    return {
      passed,
      failed,
      total: this.testResults.length,
      successRate: parseFloat(successRate),
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DocumentsAPITester();
  tester.runAllTests().then((results) => {
    process.exit(results.successRate >= 90 ? 0 : 1);
  });
}

module.exports = DocumentsAPITester;
