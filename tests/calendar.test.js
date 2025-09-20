// tests/calendar.test.js - Complete Academic Calendar Testing Suite
const request = require("supertest");
const { pool } = require("../src/config/database");
const CalendarHelpers = require("../src/utils/calendarHelpers");

// Mock app setup (you'll need to adjust based on your test setup)
const app = require("../server");

describe("Academic Calendar API", () => {
  let authToken;
  let testEventId;

  beforeAll(async () => {
    // Setup test database or use testing database
    // Login to get auth token
    const loginResponse = await request(app).post("/api/auth/login").send({
      username: "admin",
      password: "admin123",
    });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEventId) {
      await pool.execute("DELETE FROM academic_calendar WHERE id = ?", [testEventId]);
    }
    // Close database connection
    await pool.end();
  });

  // =============================================================================
  // PUBLIC ENDPOINTS TESTS
  // =============================================================================

  describe("GET /api/calendar/public/events", () => {
    it("should get public events without authentication", async () => {
      const response = await request(app).get("/api/calendar/public/events").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("events");
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it("should filter events by year", async () => {
      const response = await request(app).get("/api/calendar/public/events?year=2024").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.year).toBe("2024");
    });

    it("should filter events by event type", async () => {
      const response = await request(app).get("/api/calendar/public/events?event_type=holiday").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.event_type).toBe("holiday");
    });

    it("should limit results", async () => {
      const response = await request(app).get("/api/calendar/public/events?limit=5").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.length).toBeLessThanOrEqual(5);
    });

    it("should reject invalid parameters", async () => {
      const response = await request(app).get("/api/calendar/public/events?year=invalid").expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  describe("GET /api/calendar/public/upcoming", () => {
    it("should get upcoming public events", async () => {
      const response = await request(app).get("/api/calendar/public/upcoming").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("events");
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const response = await request(app).get("/api/calendar/public/upcoming?limit=3").expect(200);

      expect(response.body.data.events.length).toBeLessThanOrEqual(3);
    });
  });

  // =============================================================================
  // ADMIN ENDPOINTS TESTS (Require Authentication)
  // =============================================================================

  describe("POST /api/calendar", () => {
    it("should create a new calendar event", async () => {
      const eventData = {
        title: "Test Academic Event",
        description: "This is a test event for automated testing",
        event_type: "academic",
        start_date: "2024-12-25",
        end_date: "2024-12-25",
        start_time: "09:00",
        end_time: "11:00",
        is_all_day: false,
        location: "Main Hall",
        color: "#007bff",
        is_public: true,
        academic_year: "2024/2025",
        semester: "ganjil",
        reminder_days: 7,
      };

      const response = await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send(eventData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event).toHaveProperty("id");
      expect(response.body.data.event.title).toBe(eventData.title);

      // Store test event ID for cleanup
      testEventId = response.body.data.event.id;
    });

    it("should reject invalid event data", async () => {
      const invalidData = {
        title: "Te", // Too short
        event_type: "invalid_type",
        start_date: "invalid-date",
        academic_year: "invalid-format",
      };

      const response = await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send(invalidData).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it("should require authentication", async () => {
      const eventData = {
        title: "Test Event Without Auth",
        event_type: "academic",
        start_date: "2024-12-25",
        academic_year: "2024/2025",
        semester: "ganjil",
      };

      const response = await request(app).post("/api/calendar").send(eventData).expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should detect schedule conflicts", async () => {
      // First, create an event
      const firstEvent = {
        title: "First Event",
        event_type: "academic",
        start_date: "2024-12-26",
        start_time: "10:00",
        end_time: "12:00",
        location: "Conference Room A",
        academic_year: "2024/2025",
        semester: "ganjil",
      };

      await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send(firstEvent);

      // Try to create conflicting event
      const conflictingEvent = {
        title: "Conflicting Event",
        event_type: "academic",
        start_date: "2024-12-26",
        start_time: "11:00",
        end_time: "13:00",
        location: "Conference Room A", // Same location and overlapping time
        academic_year: "2024/2025",
        semester: "ganjil",
      };

      const response = await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send(conflictingEvent).expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Schedule conflict detected");
      expect(response.body.conflicting_events).toBeDefined();
    });
  });

  describe("GET /api/calendar", () => {
    it("should get all calendar events with authentication", async () => {
      const response = await request(app).get("/api/calendar").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("events");
      expect(response.body.data).toHaveProperty("pagination");
    });

    it("should filter events by multiple parameters", async () => {
      const response = await request(app).get("/api/calendar?event_type=academic&status=active&year=2024").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters).toMatchObject({
        event_type: "academic",
        status: "active",
        year: "2024",
      });
    });

    it("should paginate results", async () => {
      const response = await request(app).get("/api/calendar?limit=10&page=1").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(response.body.data.pagination).toHaveProperty("total");
      expect(response.body.data.pagination).toHaveProperty("totalPages");
    });
  });

  describe("PUT /api/calendar/:id", () => {
    it("should update existing event", async () => {
      if (!testEventId) {
        // Create a test event first
        const createResponse = await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send({
          title: "Event to Update",
          event_type: "academic",
          start_date: "2024-12-27",
          academic_year: "2024/2025",
          semester: "ganjil",
        });

        testEventId = createResponse.body.data.event.id;
      }

      const updateData = {
        title: "Updated Event Title",
        description: "Updated description",
        event_type: "exam",
        start_date: "2024-12-27",
        academic_year: "2024/2025",
        semester: "ganjil",
      };

      const response = await request(app).put(`/api/calendar/${testEventId}`).set("Authorization", `Bearer ${authToken}`).send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event.title).toBe(updateData.title);
      expect(response.body.data.event.event_type).toBe(updateData.event_type);
    });

    it("should return 404 for non-existent event", async () => {
      const response = await request(app)
        .put("/api/calendar/99999")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
          event_type: "academic",
          start_date: "2024-12-28",
          academic_year: "2024/2025",
          semester: "ganjil",
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Calendar event not found");
    });
  });

  describe("DELETE /api/calendar/:id", () => {
    it("should soft delete event (set status to cancelled)", async () => {
      if (!testEventId) {
        // Create a test event first
        const createResponse = await request(app).post("/api/calendar").set("Authorization", `Bearer ${authToken}`).send({
          title: "Event to Delete",
          event_type: "academic",
          start_date: "2024-12-28",
          academic_year: "2024/2025",
          semester: "ganjil",
        });

        testEventId = createResponse.body.data.event.id;
      }

      const response = await request(app).delete(`/api/calendar/${testEventId}`).set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Calendar event deleted successfully");

      // Verify event is soft deleted (status = cancelled)
      const [deletedEvent] = await pool.execute("SELECT status FROM academic_calendar WHERE id = ?", [testEventId]);
      expect(deletedEvent[0].status).toBe("cancelled");
    });
  });

  // =============================================================================
  // UTILITY ENDPOINTS TESTS
  // =============================================================================

  describe("GET /api/calendar/stats/overview", () => {
    it("should get calendar statistics", async () => {
      const response = await request(app).get("/api/calendar/stats/overview").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("by_status");
      expect(response.body.data).toHaveProperty("by_type");
      expect(response.body.data).toHaveProperty("upcoming_events");
      expect(response.body.data).toHaveProperty("this_month_events");
    });
  });

  describe("GET /api/calendar/export", () => {
    it("should export calendar as JSON", async () => {
      const response = await request(app).get("/api/calendar/export?format=json&year=2024").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.export_info).toHaveProperty("format", "json");
      expect(response.body.export_info).toHaveProperty("total_events");
      expect(response.body.data).toBeDefined();
    });

    it("should export calendar as iCal", async () => {
      const response = await request(app).get("/api/calendar/export?format=ical&year=2024").set("Authorization", `Bearer ${authToken}`).expect(200);

      expect(response.headers["content-type"]).toBe("text/calendar");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.text).toContain("BEGIN:VCALENDAR");
      expect(response.text).toContain("END:VCALENDAR");
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS TESTS
// =============================================================================

describe("Calendar Helpers", () => {
  describe("Academic Year Validation", () => {
    it("should validate correct academic year format", () => {
      expect(CalendarHelpers.isValidAcademicYear("2024/2025")).toBe(true);
      expect(CalendarHelpers.isValidAcademicYear("2023/2024")).toBe(true);
    });

    it("should reject invalid academic year formats", () => {
      expect(CalendarHelpers.isValidAcademicYear("2024-2025")).toBe(false);
      expect(CalendarHelpers.isValidAcademicYear("2024/2026")).toBe(false); // Not consecutive
      expect(CalendarHelpers.isValidAcademicYear("24/25")).toBe(false);
      expect(CalendarHelpers.isValidAcademicYear("invalid")).toBe(false);
    });

    it("should generate academic year from date", () => {
      const julyDate = new Date("2024-07-15"); // July = start of academic year
      expect(CalendarHelpers.generateAcademicYear(julyDate)).toBe("2024/2025");

      const januaryDate = new Date("2024-01-15"); // January = middle of academic year
      expect(CalendarHelpers.generateAcademicYear(januaryDate)).toBe("2023/2024");
    });
  });

  describe("Date Range Validation", () => {
    it("should validate correct date ranges", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const result = CalendarHelpers.validateDateRange(tomorrow.toISOString().split("T")[0], dayAfter.toISOString().split("T")[0]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject past dates", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = CalendarHelpers.validateDateRange(yesterday.toISOString().split("T")[0]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Start date cannot be in the past");
    });

    it("should reject invalid date ranges", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = CalendarHelpers.validateDateRange(tomorrow.toISOString().split("T")[0], yesterday.toISOString().split("T")[0]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("End date must be after start date");
    });
  });

  describe("Time Range Validation", () => {
    it("should validate correct time ranges", () => {
      const result = CalendarHelpers.validateTimeRange("09:00", "11:00");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid time formats", () => {
      const result = CalendarHelpers.validateTimeRange("9:00", "25:00");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid time ranges", () => {
      const result = CalendarHelpers.validateTimeRange("11:00", "09:00");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("End time must be after start time");
    });

    it("should reject too short durations", () => {
      const result = CalendarHelpers.validateTimeRange("09:00", "09:10");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event duration must be at least 15 minutes");
    });
  });

  describe("Event Type Validation", () => {
    it("should validate correct event types", () => {
      const validTypes = ["academic", "exam", "holiday", "registration", "orientation", "graduation", "other"];

      validTypes.forEach((type) => {
        expect(CalendarHelpers.isValidEventType(type)).toBe(true);
      });
    });

    it("should reject invalid event types", () => {
      expect(CalendarHelpers.isValidEventType("invalid")).toBe(false);
      expect(CalendarHelpers.isValidEventType("")).toBe(false);
      expect(CalendarHelpers.isValidEventType(null)).toBe(false);
    });

    it("should return event type configuration", () => {
      const types = CalendarHelpers.getEventTypes();
      expect(types).toHaveProperty("academic");
      expect(types).toHaveProperty("exam");
      expect(types.academic).toHaveProperty("label");
      expect(types.academic).toHaveProperty("color");
      expect(types.academic).toHaveProperty("priority");
    });
  });

  describe("Semester Detection", () => {
    it("should detect correct semester from date", () => {
      expect(CalendarHelpers.getSemesterFromDate("2024-08-15")).toBe("ganjil"); // August
      expect(CalendarHelpers.getSemesterFromDate("2024-03-15")).toBe("genap"); // March
      expect(CalendarHelpers.getSemesterFromDate("2024-12-15")).toBe("ganjil"); // December
      expect(CalendarHelpers.getSemesterFromDate("2024-01-15")).toBe("genap"); // January
    });
  });

  describe("iCal Generation", () => {
    it("should generate valid iCal event string", () => {
      const event = {
        id: 123,
        title: "Test Event",
        description: "Test Description",
        start_date: "2024-12-25",
        end_date: "2024-12-25",
        start_time: "09:00",
        end_time: "11:00",
        is_all_day: false,
        location: "Main Hall",
        event_type: "academic",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const icalString = CalendarHelpers.generateICalEvent(event);

      expect(icalString).toContain("BEGIN:VEVENT");
      expect(icalString).toContain("END:VEVENT");
      expect(icalString).toContain("SUMMARY:Test Event");
      expect(icalString).toContain("LOCATION:Main Hall");
      expect(icalString).toContain("CATEGORIES:ACADEMIC");
    });

    it("should escape special characters in iCal", () => {
      const text = "Text with; comma, newline\n and backslash\\";
      const escaped = CalendarHelpers.escapeICalText(text);

      expect(escaped).toContain("\\;");
      expect(escaped).toContain("\\,");
      expect(escaped).toContain("\\n");
      expect(escaped).toContain("\\\\");
    });
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe("Calendar Performance Tests", () => {
  it("should handle large event queries efficiently", async () => {
    const startTime = Date.now();

    const response = await request(app).get("/api/calendar?limit=100").set("Authorization", `Bearer ${authToken}`).expect(200);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    expect(response.body.success).toBe(true);
  }, 5000);

  it("should handle concurrent calendar operations", async () => {
    const promises = [];

    // Create multiple concurrent requests
    for (let i = 0; i < 10; i++) {
      promises.push(request(app).get("/api/calendar/public/events").expect(200));
    }

    const results = await Promise.all(promises);

    results.forEach((response) => {
      expect(response.body.success).toBe(true);
    });
  }, 10000);
});

// Export for use in test runner
module.exports = {
  // Export individual test suites if needed
};
