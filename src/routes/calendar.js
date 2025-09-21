// src/routes/calendar.js - COMPLETE ACADEMIC CALENDAR MANAGEMENT
const express = require("express");
const { body, query, param, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const validateCalendarEvent = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3-255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description max 1000 characters"),

  body("event_type")
    .isIn([
      "academic",
      "exam",
      "holiday",
      "registration",
      "orientation",
      "graduation",
      "other",
    ])
    .withMessage("Invalid event type"),

  body("start_date")
    .isDate()
    .withMessage("Valid start date required (YYYY-MM-DD)"),

  body("end_date")
    .optional()
    .isDate()
    .custom((value, { req }) => {
      if (value && new Date(value) < new Date(req.body.start_date)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("start_time")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid start time format (HH:MM)"),

  body("end_time")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid end time format (HH:MM)")
    .custom((value, { req }) => {
      if (value && req.body.start_time && value <= req.body.start_time) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),

  body("academic_year")
    .matches(/^20\d{2}\/20\d{2}$/)
    .withMessage("Academic year format: YYYY/YYYY"),

  body("semester")
    .isIn(["ganjil", "genap", "both"])
    .withMessage("Semester must be: ganjil, genap, or both"),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Convert undefined to null for database
const nullifyUndefined = (value) => {
  return value === undefined ? null : value;
};

// Safely parse integers
const safeParseInt = (value, defaultValue = null) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// =============================================================================
// PUBLIC ROUTES (No Authentication Required)
// =============================================================================

// GET /api/calendar/public/events - Public calendar events with filters
router.get(
  "/public/events",
  [
    query("year").optional().isInt({ min: 2020, max: 2030 }),
    query("month").optional().isInt({ min: 1, max: 12 }),
    query("event_type")
      .optional()
      .isIn([
        "academic",
        "exam",
        "holiday",
        "registration",
        "orientation",
        "graduation",
        "other",
      ]),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { year, month, event_type, limit = 50 } = req.query;

      console.log("=== DEBUG: Public events GET ===");
      console.log("Query params:", { year, month, event_type, limit });

      // Build query with proper parameter handling
      const whereConditions = ["is_public = TRUE", "status = ?"];
      const whereParams = ["active"];

      if (year) {
        whereConditions.push("YEAR(start_date) = ?");
        whereParams.push(parseInt(year));
      }

      if (month) {
        whereConditions.push("MONTH(start_date) = ?");
        whereParams.push(parseInt(month));
      }

      if (event_type) {
        whereConditions.push("event_type = ?");
        whereParams.push(event_type);
      }

      const whereClause = `WHERE ${whereConditions.join(" AND ")}`;
      const limitValue = parseInt(limit) || 50;

      const sql = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        academic_year, semester, status
      FROM academic_calendar 
      ${whereClause}
      ORDER BY start_date ASC, start_time ASC 
      LIMIT ?
    `;

      const params = [...whereParams, limitValue];

      console.log("=== DEBUG: Public events SQL ===");
      console.log("SQL:", sql);
      console.log("Params:", params);

      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const sqlWithLimit = `
  SELECT 
    id, title, description, event_type, start_date, end_date,
    start_time, end_time, is_all_day, location, color,
    academic_year, semester, status
  FROM academic_calendar 
  ${whereClause}
  ORDER BY start_date ASC, start_time ASC 
  LIMIT ${limitNum}
`;
      const [events] = await pool.execute(sqlWithLimit, whereParams);

      // Format events for frontend
      const formattedEvents = events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.event_type,
        startDate: event.start_date,
        endDate: event.end_date,
        startTime: event.start_time,
        endTime: event.end_time,
        isAllDay: event.is_all_day,
        location: event.location,
        color: event.color,
        academicYear: event.academic_year,
        semester: event.semester,
        status: event.status,
      }));

      res.json({
        success: true,
        message: "Public calendar events retrieved successfully",
        data: {
          events: formattedEvents,
          total: formattedEvents.length,
          filters: { year, month, event_type, limit },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("=== DEBUG: Public events error ===");
      console.error("Error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve public events",
        error: error.message,
      });
    }
  }
);

// GET /api/calendar/public/upcoming - Get upcoming public events
router.get(
  "/public/upcoming",
  [
    query("limit").optional().isInt({ min: 1, max: 20 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { limit = 5 } = req.query;

      const [events] = await pool.execute(
        `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        academic_year, semester
      FROM academic_calendar 
      WHERE is_public = TRUE 
        AND status = 'active'
        AND start_date >= CURDATE()
      ORDER BY start_date ASC, start_time ASC 
      LIMIT ?
    `,
        [safeParseInt(limit, 5)]
      );

      res.json({
        success: true,
        message: "Upcoming events retrieved successfully",
        data: {
          events: events.map((event) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            type: event.event_type,
            startDate: event.start_date,
            endDate: event.end_date,
            startTime: event.start_time,
            endTime: event.end_time,
            isAllDay: event.is_all_day,
            location: event.location,
            color: event.color,
            academicYear: event.academic_year,
            semester: event.semester,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get upcoming events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve upcoming events",
        error: error.message,
      });
    }
  }
);

// =============================================================================
// ADMIN ROUTES (Authentication Required)
// =============================================================================

// GET /api/calendar - Get all calendar events with advanced filtering & pagination
// REPLACE the main GET route with this simplified working version

router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("=== DEBUG: Ultra simple main GET ===");
    console.log("Query params:", req.query);

    // Step 1: Test count query (no parameters)
    console.log("=== Step 1: Testing count query ===");
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM academic_calendar`
    );
    const total = countResult[0].total;
    console.log("Count result:", total);

    // Step 2: Test main query (with basic pagination only)
    console.log("=== Step 2: Testing main query ===");
    const [events] = await pool.execute(`
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, status,
        created_at, updated_at
      FROM academic_calendar 
      ORDER BY start_date ASC 
      LIMIT 50
    `);

    console.log("Main query result:", events.length, "events");

    res.json({
      success: true,
      message: "Calendar events retrieved successfully (ultra simple)",
      data: {
        events,
        pagination: {
          page: 1,
          limit: 50,
          total,
          totalPages: Math.ceil(total / 50),
        },
        mode: "ultra_simple",
        debug: {
          totalRecords: total,
          returnedRecords: events.length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== DEBUG: Ultra simple GET error ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
    console.error("Full error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events (ultra simple)",
      error: error.message,
      debug: {
        errorName: error.name,
        errorCode: error.code,
        sqlMessage: error.sqlMessage,
      },
    });
  }
});

// GET /api/calendar/simple - Simple version without filters for testing
router.get("/simple", authenticateToken, async (req, res) => {
  try {
    console.log("=== DEBUG: Simple calendar GET ===");

    // Very simple query - no filters, no parameters
    const [events] = await pool.execute(`
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, status,
        created_at, updated_at
      FROM academic_calendar 
      ORDER BY start_date ASC 
      LIMIT 20
    `);

    console.log("=== DEBUG: Simple query successful ===");
    console.log("Events found:", events.length);

    res.json({
      success: true,
      message: "Calendar events retrieved successfully (simple mode)",
      data: {
        events,
        total: events.length,
        mode: "simple",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== DEBUG: Simple GET error ===");
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events (simple mode)",
      error: error.message,
    });
  }
});

router.get("/basic", authenticateToken, async (req, res) => {
  try {
    console.log("=== DEBUG: Basic calendar GET - No parameters ===");

    // Absolutely simple query with no dynamic parameters
    const sql = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, status,
        created_at, updated_at
      FROM academic_calendar 
      ORDER BY start_date DESC 
      LIMIT 50
    `;

    console.log("=== DEBUG: Basic SQL ===");
    console.log("SQL:", sql);
    console.log("No parameters");

    const [events] = await pool.execute(sql);

    console.log("=== DEBUG: Basic query successful ===");
    console.log("Events found:", events.length);

    res.json({
      success: true,
      message: "Calendar events retrieved successfully (basic mode)",
      data: {
        events,
        total: events.length,
        mode: "basic",
        note: "No filters applied - showing latest 50 events",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== DEBUG: Basic GET error ===");
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events (basic mode)",
      error: error.message,
    });
  }
});

// ULTRA SIMPLE GET for testing parameter binding
router.get("/test-params", async (req, res) => {
  try {
    const { year } = req.query;

    if (year) {
      console.log("=== DEBUG: Testing parameter binding ===");
      console.log("Year param:", year);

      // Simple test with one parameter
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count FROM academic_calendar WHERE YEAR(start_date) = ?`,
        [parseInt(year)]
      );

      res.json({
        success: true,
        message: "Parameter test successful",
        data: {
          year: parseInt(year),
          count: result[0].count,
        },
      });
    } else {
      // Test with no parameters
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count FROM academic_calendar`
      );

      res.json({
        success: true,
        message: "No parameter test successful",
        data: {
          totalEvents: result[0].count,
        },
      });
    }
  } catch (error) {
    console.error("=== DEBUG: Parameter test error ===");
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: "Parameter test failed",
      error: error.message,
    });
  }
});

// POST /api/calendar - Create new calendar event with conflict detection
router.post(
  "/",
  authenticateToken,
  requirePermission("manage_settings"),
  validateCalendarEvent,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log("=== DEBUG: Create event request body ===");
      console.log("Body:", req.body);

      // Properly destructure with default values and null handling
      const {
        title,
        description = null,
        event_type,
        start_date,
        end_date = null,
        start_time = null,
        end_time = null,
        is_all_day = false,
        location = null,
        color = "#007bff",
        is_public = true,
        academic_year,
        semester,
        reminder_days = 0,
      } = req.body;

      // Create parameters array with proper null handling
      const insertParams = [
        title, // title
        nullifyUndefined(description), // description
        event_type, // event_type
        start_date, // start_date
        nullifyUndefined(end_date), // end_date
        nullifyUndefined(start_time), // start_time
        nullifyUndefined(end_time), // end_time
        Boolean(is_all_day), // is_all_day
        nullifyUndefined(location), // location
        color, // color
        Boolean(is_public), // is_public
        academic_year, // academic_year
        semester, // semester
        req.user.id, // created_by
        safeParseInt(reminder_days, 0), // reminder_days
      ];

      console.log("=== DEBUG: Insert parameters ===");
      console.log("Params:", insertParams);
      console.log("Params length:", insertParams.length);

      // Check for undefined values
      const hasUndefined = insertParams.some((param) => param === undefined);
      if (hasUndefined) {
        console.error("=== ERROR: Found undefined parameters ===");
        console.log(
          "Parameters with undefined:",
          insertParams.map((p, i) => ({
            index: i,
            value: p,
            isUndefined: p === undefined,
          }))
        );
        return res.status(400).json({
          success: false,
          message: "Invalid parameters - some required fields are missing",
          debug: "Parameters contain undefined values",
        });
      }

      // Check for conflicting events (simplified - only if location provided)
      if (location && start_time && !is_all_day) {
        const [conflicts] = await pool.execute(
          `
          SELECT id, title FROM academic_calendar 
          WHERE location = ? 
            AND start_date = ? 
            AND is_all_day = FALSE
            AND start_time = ?
            AND status = 'active'
        `,
          [location, start_date, start_time]
        );

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Schedule conflict detected",
            conflicting_events: conflicts,
          });
        }
      }

      // Insert new event with proper parameter count
      const insertSQL = `
        INSERT INTO academic_calendar (
          title, description, event_type, start_date, end_date,
          start_time, end_time, is_all_day, location, color,
          is_public, academic_year, semester, created_by,
          reminder_days, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `;

      console.log("=== DEBUG: Insert SQL ===");
      console.log("SQL:", insertSQL);

      const [result] = await pool.execute(insertSQL, insertParams);

      console.log("=== DEBUG: Insert result ===");
      console.log("Insert ID:", result.insertId);

      // Get the created event
      const [newEvent] = await pool.execute(
        `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: "Calendar event created successfully",
        data: {
          event: newEvent[0],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Create calendar event error:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage,
      });

      res.status(500).json({
        success: false,
        message: "Failed to create calendar event",
        error: error.message,
        debug: {
          errorName: error.name,
          errorCode: error.code,
          sqlMessage: error.sqlMessage,
        },
      });
    }
  }
);

// GET /api/calendar/:id - Get single calendar event
router.get(
  "/:id",
  authenticateToken,
  param("id").isInt().withMessage("Valid event ID required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [events] = await pool.execute(
        `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
        [safeParseInt(id)]
      );

      if (events.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Calendar event not found",
        });
      }

      res.json({
        success: true,
        message: "Calendar event retrieved successfully",
        data: {
          event: events[0],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get calendar event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve calendar event",
        error: error.message,
      });
    }
  }
);

// PUT /api/calendar/:id - Update calendar event
router.put(
  "/:id",
  authenticateToken,
  requirePermission("manage_settings"),
  param("id").isInt().withMessage("Valid event ID required"),
  validateCalendarEvent,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if event exists
      const [existingEvent] = await pool.execute(
        `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
        [safeParseInt(id)]
      );

      if (existingEvent.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Calendar event not found",
        });
      }

      // Properly handle update parameters
      const {
        title,
        description = null,
        event_type,
        start_date,
        end_date = null,
        start_time = null,
        end_time = null,
        is_all_day = false,
        location = null,
        color = "#007bff",
        is_public = true,
        academic_year,
        semester,
        reminder_days = 0,
        status = "active",
      } = req.body;

      const updateParams = [
        title,
        nullifyUndefined(description),
        event_type,
        start_date,
        nullifyUndefined(end_date),
        nullifyUndefined(start_time),
        nullifyUndefined(end_time),
        Boolean(is_all_day),
        nullifyUndefined(location),
        color,
        Boolean(is_public),
        academic_year,
        semester,
        safeParseInt(reminder_days, 0),
        status,
        safeParseInt(id),
      ];

      // Update event
      await pool.execute(
        `
        UPDATE academic_calendar SET
          title = ?, description = ?, event_type = ?, start_date = ?, 
          end_date = ?, start_time = ?, end_time = ?, is_all_day = ?,
          location = ?, color = ?, is_public = ?, academic_year = ?,
          semester = ?, reminder_days = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `,
        updateParams
      );

      // Get updated event
      const [updatedEvent] = await pool.execute(
        `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
        [safeParseInt(id)]
      );

      res.json({
        success: true,
        message: "Calendar event updated successfully",
        data: {
          event: updatedEvent[0],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Update calendar event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update calendar event",
        error: error.message,
      });
    }
  }
);

// DELETE /api/calendar/:id - Soft delete calendar event
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("manage_settings"),
  param("id").isInt().withMessage("Valid event ID required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if event exists
      const [existingEvent] = await pool.execute(
        `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
        [safeParseInt(id)]
      );

      if (existingEvent.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Calendar event not found",
        });
      }

      // Soft delete
      await pool.execute(
        `
        UPDATE academic_calendar SET status = 'cancelled', updated_at = NOW()
        WHERE id = ?
      `,
        [safeParseInt(id)]
      );

      res.json({
        success: true,
        message: "Calendar event deleted successfully",
        data: {
          deleted_event: existingEvent[0],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Delete calendar event error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete calendar event",
        error: error.message,
      });
    }
  }
);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// GET /api/calendar/stats/overview - Calendar statistics
router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    // Simple stats queries
    const [statusStats] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM academic_calendar 
      GROUP BY status
    `);

    const [typeStats] = await pool.execute(`
      SELECT event_type, COUNT(*) as count 
      FROM academic_calendar 
      WHERE status = 'active'
      GROUP BY event_type
    `);

    const [upcomingCount] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM academic_calendar 
      WHERE start_date >= CURDATE() AND status = 'active'
    `);

    const [thisMonthCount] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM academic_calendar 
      WHERE YEAR(start_date) = YEAR(CURDATE()) 
        AND MONTH(start_date) = MONTH(CURDATE())
        AND status = 'active'
    `);

    res.json({
      success: true,
      message: "Calendar statistics retrieved successfully",
      data: {
        by_status: statusStats,
        by_type: typeStats,
        upcoming_events: upcomingCount[0].count,
        this_month_events: thisMonthCount[0].count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get calendar stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar statistics",
      error: error.message,
    });
  }
});

// GET /api/calendar/export - Export calendar (JSON/iCal format)
router.get(
  "/export",
  authenticateToken,
  [
    query("format")
      .optional()
      .isIn(["json", "ical"])
      .withMessage("Format must be json or ical"),
    query("year").optional().isInt({ min: 2020, max: 2030 }),
    query("public_only").optional().isBoolean(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { format = "json", year, public_only = false } = req.query;

      let sql = `
      SELECT * FROM academic_calendar 
      WHERE status = 'active'
    `;
      const params = [];

      if (public_only === "true") {
        sql += ` AND is_public = TRUE`;
      }

      if (year) {
        sql += ` AND YEAR(start_date) = ?`;
        params.push(parseInt(year));
      }

      sql += ` ORDER BY start_date ASC`;

      const [events] = await pool.execute(sql, params);

      if (format === "ical") {
        // Generate iCal format
        let icalContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//School Calendar//NONSGML v1.0//EN",
          "CALSCALE:GREGORIAN",
        ];

        events.forEach((event) => {
          const startDateTime = `${event.start_date
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}T${(event.start_time || "00:00:00").replace(
            /:/g,
            ""
          )}00Z`;
          const endDateTime = event.end_date
            ? `${event.end_date
                .toISOString()
                .slice(0, 10)
                .replace(/-/g, "")}T${(event.end_time || "23:59:59").replace(
                /:/g,
                ""
              )}00Z`
            : startDateTime;

          icalContent.push(
            "BEGIN:VEVENT",
            `UID:${event.id}@school-calendar`,
            `DTSTART:${startDateTime}`,
            `DTEND:${endDateTime}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description || ""}`,
            `LOCATION:${event.location || ""}`,
            `CATEGORIES:${event.event_type}`,
            "END:VEVENT"
          );
        });

        icalContent.push("END:VCALENDAR");

        res.setHeader("Content-Type", "text/calendar");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="calendar-${year || "all"}.ics"`
        );
        res.send(icalContent.join("\r\n"));
      } else {
        // JSON format
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="calendar-${year || "all"}.json"`
        );
        res.json({
          success: true,
          export_info: {
            format: "json",
            total_events: events.length,
            export_date: new Date().toISOString(),
            filters: { year, public_only },
          },
          data: events,
        });
      }
    } catch (error) {
      console.error("Export calendar error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export calendar",
        error: error.message,
      });
    }
  }
);

// =============================================================================
// DEBUG ROUTES (can be removed in production)
// =============================================================================

// GET /api/calendar/debug/params - Test parameter handling
router.get("/debug/params", async (req, res) => {
  try {
    console.log("=== DEBUG: Parameter test ===");
    console.log("Query params:", req.query);

    const { year, event_type } = req.query;

    // Test simple parameterized query
    if (year && event_type) {
      const [result] = await pool.execute(
        `SELECT COUNT(*) as count FROM academic_calendar WHERE YEAR(start_date) = ? AND event_type = ?`,
        [parseInt(year), event_type]
      );

      res.json({
        success: true,
        message: "Parameter test successful",
        data: {
          queryParams: req.query,
          sqlParams: [parseInt(year), event_type],
          result: result[0],
        },
      });
    } else {
      res.json({
        success: true,
        message: "Parameter test - no params provided",
        data: {
          queryParams: req.query,
          instruction: "Add ?year=2024&event_type=academic to test",
        },
      });
    }
  } catch (error) {
    console.error("=== DEBUG: Parameter test error ===");
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: "Parameter test failed",
      error: error.message,
    });
  }
});

// GET /api/calendar/debug/table - Check table structure
router.get("/debug/table", async (req, res) => {
  try {
    console.log("=== DEBUG: Checking academic_calendar table ===");

    // Check if table exists
    const [tableExists] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'academic_calendar'
    `);

    if (tableExists[0].count === 0) {
      return res.json({
        success: false,
        message: "Table academic_calendar does not exist",
        debug: { tableExists: false },
      });
    }

    // Get table structure
    const [structure] = await pool.execute(`DESCRIBE academic_calendar`);

    // Count records
    const [recordCount] = await pool.execute(
      `SELECT COUNT(*) as total FROM academic_calendar`
    );

    // Sample records
    const [sampleRecords] = await pool.execute(
      `SELECT * FROM academic_calendar LIMIT 3`
    );

    res.json({
      success: true,
      message: "Table structure checked successfully",
      data: {
        tableExists: true,
        structure: structure,
        totalRecords: recordCount[0].total,
        sampleRecords: sampleRecords,
      },
    });
  } catch (error) {
    console.error("=== DEBUG: Table check error ===");
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check table structure",
      error: error.message,
    });
  }
});

module.exports = router;
