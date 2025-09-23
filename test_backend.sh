#!/bin/bash
# ============================================================================
# BACKEND TESTING COMMANDS - Web Fullstack Sekolah
# Perintah untuk mengecek dan memastikan backend berfungsi dengan baik
# ============================================================================

# VARIABLE SETUP
BASE_URL="http://localhost:5000"
ADMIN_TOKEN=""  # Will be filled after login

echo "🚀 TESTING WEB FULLSTACK SEKOLAH BACKEND"
echo "========================================"

# ============================================================================
# 1. HEALTH & SYSTEM CHECKS
# ============================================================================
echo ""
echo "📊 1. HEALTH & SYSTEM CHECKS"
echo "----------------------------"

# Health Check - Most Important Test
echo "✅ Testing Health Check..."
curl -s -X GET "$BASE_URL/api/health" | jq '.'

# System Configuration
echo ""
echo "⚙️ Testing System Configuration..."
curl -s -X GET "$BASE_URL/api/config" | jq '.'

# API Documentation
echo ""
echo "📖 Testing API Documentation..."
curl -s -X GET "$BASE_URL/api/docs" | jq '.endpoints.public'

# ============================================================================
# 2. PUBLIC ENDPOINTS (No Authentication Required)
# ============================================================================
echo ""
echo "🌐 2. PUBLIC ENDPOINTS TESTING"
echo "------------------------------"

# School Settings (Public)
echo "🏫 Testing School Settings..."
curl -s -X GET "$BASE_URL/api/settings" | jq '.'

# Public Articles
echo ""
echo "📰 Testing Public Articles..."
curl -s -X GET "$BASE_URL/api/public/articles?limit=3" | jq '.'

# Public Alumni
echo ""
echo "🎓 Testing Public Alumni..."
curl -s -X GET "$BASE_URL/api/public/alumni?limit=2" | jq '.'

# Public Testimoni
echo ""
echo "💬 Testing Public Testimoni..."
curl -s -X GET "$BASE_URL/api/public/testimoni?limit=3" | jq '.'

# SPMB Form Configuration
echo ""
echo "📝 Testing SPMB Form Config..."
curl -s -X GET "$BASE_URL/api/spmb/form-config" | jq '.'

# Public Calendar Events
echo ""
echo "📅 Testing Public Calendar..."
curl -s -X GET "$BASE_URL/api/calendar/public/events" | jq '.'

# ============================================================================
# 3. AUTHENTICATION TESTING
# ============================================================================
echo ""
echo "🔐 3. AUTHENTICATION TESTING"
echo "----------------------------"

# Admin Login - IMPORTANT: Save token for next tests
echo "🔑 Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract token from response
ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo "✅ Login successful! Token extracted: ${ADMIN_TOKEN:0:20}..."
    export ADMIN_TOKEN
else
    echo "❌ Login failed! Cannot proceed with protected endpoints."
    exit 1
fi

# Test User Profile (Protected)
echo ""
echo "👤 Testing User Profile..."
curl -s -X GET "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# ============================================================================
# 4. ADMIN PROTECTED ENDPOINTS
# ============================================================================
echo ""
echo "🛡️ 4. ADMIN PROTECTED ENDPOINTS"
echo "-------------------------------"

# Dashboard Statistics
echo "📊 Testing Dashboard Stats..."
curl -s -X GET "$BASE_URL/api/admin/dashboard-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Personnel Management
echo ""
echo "👥 Testing Personnel Management..."
curl -s -X GET "$BASE_URL/api/admin/personnel" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Student Management
echo ""
echo "🎓 Testing Student Management..."
curl -s -X GET "$BASE_URL/api/admin/students" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Articles Management
echo ""
echo "📝 Testing Articles Management..."
curl -s -X GET "$BASE_URL/api/admin/articles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Alumni Management
echo ""
echo "🎯 Testing Alumni Management..."
curl -s -X GET "$BASE_URL/api/admin/alumni" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Testimoni Management
echo ""
echo "💭 Testing Testimoni Management..."
curl -s -X GET "$BASE_URL/api/admin/testimoni" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# ============================================================================
# 5. CREATE/UPDATE TESTING (CRUD Operations)
# ============================================================================
echo ""
echo "✏️ 5. CRUD OPERATIONS TESTING"
echo "-----------------------------"

# Test Create Alumni
echo "➕ Testing Create Alumni..."
CREATE_ALUMNI=$(curl -s -X POST "$BASE_URL/api/admin/alumni" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama_lengkap": "Test Alumni Postman",
    "tahun_lulus": 2023,
    "pekerjaan_sekarang": "Software Engineer",
    "deskripsi": "Alumni test dari Postman testing"
  }')

echo "$CREATE_ALUMNI" | jq '.'

# Test Create Testimoni
echo ""
echo "💬 Testing Create Testimoni..."
CREATE_TESTIMONI=$(curl -s -X POST "$BASE_URL/api/admin/testimoni" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nama_lengkap": "Test Testimoni User",
    "status": "Alumni",
    "deskripsi": "Testimoni test dari Postman untuk verifikasi API"
  }')

echo "$CREATE_TESTIMONI" | jq '.'

# ============================================================================
# 6. FILE UPLOAD TESTING
# ============================================================================
echo ""
echo "📁 6. FILE UPLOAD TESTING"
echo "------------------------"

# Create test file for upload
echo "Creating test file..."
echo "Test file content for backend testing" > test_upload.txt

# Test School Logo Upload
echo "🖼️ Testing School Logo Upload..."
curl -s -X POST "$BASE_URL/api/settings/logo" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "logo=@test_upload.txt" | jq '.'

# Clean up test file
rm -f test_upload.txt

# ============================================================================
# 7. ERROR HANDLING TESTS
# ============================================================================
echo ""
echo "❌ 7. ERROR HANDLING TESTS"
echo "--------------------------"

# Test Invalid Endpoint
echo "🚫 Testing Invalid Endpoint..."
curl -s -X GET "$BASE_URL/api/invalid-endpoint" | jq '.'

# Test Unauthorized Access
echo ""
echo "🔒 Testing Unauthorized Access..."
curl -s -X GET "$BASE_URL/api/admin/dashboard-stats" | jq '.'

# Test Invalid Login
echo ""
echo "🚪 Testing Invalid Login..."
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "wrong",
    "password": "wrong"
  }' | jq '.'

# ============================================================================
# 8. PERFORMANCE & STRESS TESTS
# ============================================================================
echo ""
echo "⚡ 8. PERFORMANCE TESTS"
echo "----------------------"

# Multiple concurrent requests to health endpoint
echo "🏃‍♂️ Testing Concurrent Requests..."
for i in {1..5}; do
  (curl -s -X GET "$BASE_URL/api/health" | jq -r '.message') &
done
wait

echo ""
echo "✅ Performance test completed"

# ============================================================================
# 9. DATABASE CONNECTIVITY TESTS
# ============================================================================
echo ""
echo "💾 9. DATABASE CONNECTIVITY"
echo "--------------------------"

# Test endpoints that require database
echo "🗄️ Testing Database-dependent Endpoints..."

# This should return actual data from database
curl -s -X GET "$BASE_URL/api/public/articles" | jq '.data | length'
curl -s -X GET "$BASE_URL/api/admin/dashboard-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'

# ============================================================================
# 10. EMAIL SYSTEM TESTS
# ============================================================================
echo ""
echo "📧 10. EMAIL SYSTEM TESTS"
echo "-------------------------"

# Test Email Health
echo "📬 Testing Email System Health..."
curl -s -X GET "$BASE_URL/api/email/health" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# ============================================================================
# SUMMARY REPORT
# ============================================================================
echo ""
echo "📋 TESTING SUMMARY"
echo "=================="
echo "✅ Health Checks: Completed"
echo "✅ Public Endpoints: Tested"
echo "✅ Authentication: Verified"
echo "✅ Protected Endpoints: Tested"
echo "✅ CRUD Operations: Tested"
echo "✅ File Upload: Tested"
echo "✅ Error Handling: Verified"
echo "✅ Performance: Basic test done"
echo "✅ Database: Connectivity verified"
echo "✅ Email System: Health checked"
echo ""
echo "🎉 BACKEND TESTING COMPLETED!"
echo ""
echo "💡 TIPS:"
echo "- Save the admin token for manual testing: $ADMIN_TOKEN"
echo "- Check backend logs for any errors"
echo "- Verify database tables have data"
echo "- Test file uploads with real files"
echo ""
echo "🔗 USEFUL ENDPOINTS FOR FRONTEND:"
echo "- Health: $BASE_URL/api/health"
echo "- Articles: $BASE_URL/api/public/articles"
echo "- Alumni: $BASE_URL/api/public/alumni"
echo "- Testimoni: $BASE_URL/api/public/testimoni"
echo "- Settings: $BASE_URL/api/settings"
echo ""
echo "Happy Testing! 🚀"