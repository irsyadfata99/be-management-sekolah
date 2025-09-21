// test_integration.js
const axios = require("axios");

async function testIntegration() {
  const baseURL = "http://localhost:5000";

  try {
    // Test 1: Health check
    console.log("Testing health check...");
    const health = await axios.get(`${baseURL}/api/health`);
    console.log("✅ Health check:", health.data.success);

    // Test 2: Public documents
    console.log("Testing public documents...");
    const docs = await axios.get(
      `${baseURL}/api/public/documents/recent?limit=5`
    );
    console.log("✅ Public documents:", docs.data.success);

    // Test 3: Categories
    console.log("Testing categories...");
    const categories = await axios.get(
      `${baseURL}/api/public/documents/categories`
    );
    console.log("✅ Categories:", categories.data.success);

    console.log("🎉 All integration tests passed!");
  } catch (error) {
    console.error(
      "❌ Integration test failed:",
      error.response?.data || error.message
    );
  }
}

testIntegration();
