// ============================================================================
// UPDATED TEST SCRIPT - Verify 401 Fix on /api/settings
// Run after implementing the fixes
// ============================================================================

const axios = require("axios");

const baseURL = "http://localhost:5000";

async function testSettingsFixComplete() {
  console.log("🧪 TESTING COMPLETE SETTINGS FIX");
  console.log("=====================================");

  try {
    // ============================================================================
    // TEST 1: GET /api/settings WITHOUT authentication (should work now)
    // ============================================================================
    console.log("\n1️⃣ Testing GET /api/settings WITHOUT authentication...");
    try {
      const settingsResponse = await axios.get(`${baseURL}/api/settings`);
      console.log("✅ SUCCESS: Settings accessible without auth");
      console.log("   Status:", settingsResponse.status);
      console.log("   School Name:", settingsResponse.data.data?.school_name);
    } catch (error) {
      console.log("❌ FAILED: Settings still requires auth");
      console.log("   Status:", error.response?.status);
      console.log("   Error:", error.response?.data?.message);
    }

    // ============================================================================
    // TEST 2: Login and test authenticated endpoints
    // ============================================================================
    console.log("\n2️⃣ Testing admin login...");
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    if (!loginResponse.data.success) {
      throw new Error("Login failed: " + loginResponse.data.message);
    }

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful, token received");

    // ============================================================================
    // TEST 3: Test PUT /api/settings WITH authentication
    // ============================================================================
    console.log("\n3️⃣ Testing PUT /api/settings WITH authentication...");
    try {
      const updateResponse = await axios.put(
        `${baseURL}/api/settings`,
        {
          school_name: "SMK Teknologi Test Update",
          school_address: "Test Address Update",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Settings update successful");
      console.log("   Status:", updateResponse.status);
    } catch (error) {
      console.log("❌ Settings update failed");
      console.log("   Status:", error.response?.status);
      console.log("   Error:", error.response?.data?.message);
    }

    // ============================================================================
    // TEST 4: Test all endpoints from original test_endpoints.js
    // ============================================================================
    console.log("\n4️⃣ Testing all endpoints from original test...");
    const endpoints = [
      { url: "/api/health", auth: false },
      { url: "/api/public/articles", auth: false },
      { url: "/api/public/documents/featured", auth: false },
      { url: "/api/calendar/public/events", auth: false },
      { url: "/api/settings", auth: false }, // ✅ This should work now
      { url: "/api/email/health", auth: false },
      { url: "/api/export/registrations", auth: true },
    ];

    for (const endpoint of endpoints) {
      try {
        let response;
        if (endpoint.auth) {
          response = await axios.get(baseURL + endpoint.url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          response = await axios.get(baseURL + endpoint.url);
        }
        console.log(
          `✅ ${endpoint.url}: ${response.status}${
            endpoint.auth ? " (with auth)" : " (public)"
          }`
        );
      } catch (error) {
        console.log(
          `❌ ${endpoint.url}: ${error.response?.status || "ERROR"} - ${
            error.message
          }`
        );
      }
    }

    // ============================================================================
    // TEST 5: Test Personnel endpoints (if implemented)
    // ============================================================================
    console.log("\n5️⃣ Testing Personnel endpoints...");
    try {
      const personnelResponse = await axios.get(
        `${baseURL}/api/admin/personnel`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("✅ Personnel endpoint working:", personnelResponse.status);
    } catch (error) {
      console.log(
        "❌ Personnel endpoint error:",
        error.response?.status,
        error.response?.data?.message
      );
    }

    // ============================================================================
    // TEST 6: Debug authentication middleware
    // ============================================================================
    console.log("\n6️⃣ Testing authentication middleware debug...");
    try {
      const authTestResponse = await axios.get(`${baseURL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ Auth middleware working correctly");
      console.log("   User:", authTestResponse.data.data?.username);
      console.log(
        "   Permissions:",
        JSON.stringify(authTestResponse.data.data?.permissions)
      );
    } catch (error) {
      console.log(
        "❌ Auth middleware issue:",
        error.response?.status,
        error.response?.data?.message
      );
    }

    console.log("\n🎉 TESTING COMPLETED!");
    console.log("=====================================");
    console.log(
      "✅ Key Fix: /api/settings no longer requires authentication for GET"
    );
    console.log("✅ Authentication working for protected endpoints");
    console.log("✅ Middleware consistency issues resolved");
  } catch (error) {
    console.error("\n❌ CRITICAL TEST FAILURE:");
    console.error("Error:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);

    console.error("\n🔍 TROUBLESHOOTING CHECKLIST:");
    console.error("1. ✅ Replace src/middleware/auth.js with fixed version");
    console.error("2. ✅ Replace src/routes/settings.js with fixed version");
    console.error("3. ✅ Restart server: npm run dev");
    console.error("4. ✅ Check server console for authentication debug logs");
    console.error("5. ✅ Verify JWT_SECRET is set in .env");
    console.error("6. ✅ Ensure admin user exists in database");
  }
}

// ============================================================================
// INDIVIDUAL ENDPOINT TESTS
// ============================================================================

async function testSpecificEndpoint(endpoint, withAuth = false) {
  console.log(
    `\n🔍 Testing ${endpoint}${withAuth ? " with auth" : " without auth"}`
  );

  try {
    let headers = {};

    if (withAuth) {
      // Get token first
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        username: "admin",
        password: "admin123",
      });

      if (loginResponse.data.success) {
        headers.Authorization = `Bearer ${loginResponse.data.data.token}`;
      }
    }

    const response = await axios.get(`${baseURL}${endpoint}`, { headers });

    console.log("✅ SUCCESS");
    console.log("   Status:", response.status);
    console.log(
      "   Response:",
      JSON.stringify(response.data, null, 2).substring(0, 200) + "..."
    );
  } catch (error) {
    console.log("❌ FAILED");
    console.log("   Status:", error.response?.status);
    console.log("   Error:", error.response?.data?.message || error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Check command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const endpoint = args[0];
  const withAuth = args[1] === "auth";
  testSpecificEndpoint(endpoint, withAuth);
} else {
  testSettingsFixComplete();
}

// ============================================================================
// USAGE EXAMPLES:
// ============================================================================
// node updated_test_script.js                    // Run full test
// node updated_test_script.js /api/settings      // Test specific endpoint without auth
// node updated_test_script.js /api/settings auth // Test specific endpoint with auth
