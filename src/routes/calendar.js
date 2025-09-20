// src/routes/calendar.js - Complete Academic Calendar Management
const express = require("express");
const { body, query, param, validationResult } = require("express-validator");
const { pool } = require("../config/database");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const validateCalendarEvent = [
  body("title").trim().isLength({ min: 3, max: 255 }).withMessage("Title must be between 3-255 characters"),

  body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description max 1000 characters"),

  body("event_type").isIn(["academic", "exam", "holiday", "registration", "orientation", "graduation", "other"]).withMessage("Invalid event type"),

  body("start_date").isDate().withMessage("Valid start date required (YYYY-MM-DD)"),

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

  body("is_all_day").optional().isBoolean().withMessage("is_all_day must be boolean"),

  body("location").optional().trim().isLength({ max: 255 }).withMessage("Location max 255 characters"),

  body("color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Color must be valid hex code (#RRGGBB)"),

  body("is_public").optional().isBoolean().withMessage("is_public must be boolean"),

  body("academic_year")
    .matches(/^20\d{2}\/20\d{2}$/)
    .withMessage("Academic year format: YYYY/YYYY"),

  body("semester").isIn(["ganjil", "genap", "both"]).withMessage("Semester must be: ganjil, genap, or both"),

  body("reminder_days").optional().isInt({ min: 0, max: 365 }).withMessage("Reminder days: 0-365"),
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
// PUBLIC ROUTES (No Authentication Required)
// =============================================================================

// GET /api/calendar/public/events - Public calendar events
router.get(
  "/public/events",
  [
    query("year").optional().isInt({ min: 2020, max: 2030 }),
    query("month").optional().isInt({ min: 1, max: 12 }),
    query("event_type").optional().isIn(["academic", "exam", "holiday", "registration", "orientation", "graduation", "other"]),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { year, month, event_type, limit = 50 } = req.query;

      let sql = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        academic_year, semester, status
      FROM academic_calendar 
      WHERE is_public = TRUE AND status = 'active'
    `;

      const params = [];

      // Filter by year/month
      if (year) {
        sql += ` AND YEAR(start_date) = ?`;
        params.push(year);
      }

      if (month) {
        sql += ` AND MONTH(start_date) = ?`;
        params.push(month);
      }

      // Filter by event type
      if (event_type) {
        sql += ` AND event_type = ?`;
        params.push(event_type);
      }

      sql += ` ORDER BY start_date ASC, start_time ASC LIMIT ?`;
      params.push(parseInt(limit));

      const [events] = await pool.execute(sql, params);

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
      console.error("Get public events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve public events",
        error: error.message,
      });
    }
  }
);

// GET /api/calendar/public/upcoming - Get upcoming public events
router.get("/public/upcoming", [query("limit").optional().isInt({ min: 1, max: 20 }), handleValidationErrors], async (req, res) => {
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
      [parseInt(limit)]
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
});

// =============================================================================
// ADMIN ROUTES (Authentication Required)
// =============================================================================

// GET /api/calendar - Get all calendar events (Admin)
router.get(
  "/",
  authenticateToken,
  [
    query("year").optional().isInt({ min: 2020, max: 2030 }),
    query("month").optional().isInt({ min: 1, max: 12 }),
    query("event_type").optional().isIn(["academic", "exam", "holiday", "registration", "orientation", "graduation", "other"]),
    query("status").optional().isIn(["active", "cancelled", "completed"]),
    query("academic_year")
      .optional()
      .matches(/^20\d{2}\/20\d{2}$/),
    query("semester").optional().isIn(["ganjil", "genap", "both"]),
    query("limit").optional().isInt({ min: 1, max: 200 }),
    query("page").optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { year, month, event_type, status, academic_year, semester, limit = 50, page = 1 } = req.query;

      let sql = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, created_by, status,
        reminder_days, created_at, updated_at
      FROM academic_calendar 
      WHERE 1=1
    `;

      const params = [];

      // Apply filters
      if (year) {
        sql += ` AND YEAR(start_date) = ?`;
        params.push(year);
      }

      if (month) {
        sql += ` AND MONTH(start_date) = ?`;
        params.push(month);
      }

      if (event_type) {
        sql += ` AND event_type = ?`;
        params.push(event_type);
      }

      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }

      if (academic_year) {
        sql += ` AND academic_year = ?`;
        params.push(academic_year);
      }

      if (semester) {
        sql += ` AND semester = ?`;
        params.push(semester);
      }

      // Count total for pagination
      const countSql = sql.replace(
        "SELECT id, title, description, event_type, start_date, end_date, start_time, end_time, is_all_day, location, color, is_public, academic_year, semester, created_by, status, reminder_days, created_at, updated_at",
        "SELECT COUNT(*) as total"
      );
      const [countResult] = await pool.execute(countSql, params);
      const total = countResult[0].total;

      // Add pagination
      sql += ` ORDER BY start_date ASC, start_time ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const [events] = await pool.execute(sql, params);

      res.json({
        success: true,
        message: "Calendar events retrieved successfully",
        data: {
          events,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
          },
          filters: { year, month, event_type, status, academic_year, semester },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get calendar events error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve calendar events",
        error: error.message,
      });
    }
  }
);

// POST /api/calendar - Create new calendar event
router.post("/", authenticateToken, requirePermission("manage_settings"), validateCalendarEvent, handleValidationErrors, async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, is_all_day = false, location, color = "#007bff", is_public = true, academic_year, semester, reminder_days = 0 } = req.body;

    // Check for conflicting events (same date/time/location)
    if (location && !is_all_day && start_time) {
      const [conflicts] = await pool.execute(
        `
          SELECT id, title FROM academic_calendar 
          WHERE location = ? 
            AND start_date = ? 
            AND is_all_day = FALSE
            AND ((start_time <= ? AND end_time > ?) OR 
                 (start_time < ? AND end_time >= ?))
            AND status = 'active'
        `,
        [location, start_date, start_time, start_time, end_time || start_time, end_time || start_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Schedule conflict detected",
          conflicting_events: conflicts,
        });
      }
    }

    // Insert new event
    const [result] = await pool.execute(
      `
        INSERT INTO academic_calendar (
          title, description, event_type, start_date, end_date,
          start_time, end_time, is_all_day, location, color,
          is_public, academic_year, semester, created_by,
          reminder_days, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [title, description, event_type, start_date, end_date, start_time, end_time, is_all_day, location, color, is_public, academic_year, semester, req.user.id, reminder_days]
    );

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
    res.status(500).json({
      success: false,
      message: "Failed to create calendar event",
      error: error.message,
    });
  }
});

// GET /api/calendar/:id - Get single calendar event
router.get("/:id", authenticateToken, param("id").isInt().withMessage("Valid event ID required"), handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await pool.execute(
      `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
      [id]
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
});

// PUT /api/calendar/:id - Update calendar event
router.put("/:id", authenticateToken, requirePermission("manage_settings"), param("id").isInt().withMessage("Valid event ID required"), validateCalendarEvent, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_type, start_date, end_date, start_time, end_time, is_all_day, location, color, is_public, academic_year, semester, reminder_days, status } = req.body;

    // Check if event exists
    const [existingEvent] = await pool.execute(
      `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
      [id]
    );

    if (existingEvent.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    // Check for conflicts (exclude current event)
    if (location && !is_all_day && start_time) {
      const [conflicts] = await pool.execute(
        `
          SELECT id, title FROM academic_calendar 
          WHERE location = ? 
            AND start_date = ? 
            AND is_all_day = FALSE
            AND id != ?
            AND ((start_time <= ? AND end_time > ?) OR 
                 (start_time < ? AND end_time >= ?))
            AND status = 'active'
        `,
        [location, start_date, id, start_time, start_time, end_time || start_time, end_time || start_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Schedule conflict detected",
          conflicting_events: conflicts,
        });
      }
    }

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
      [title, description, event_type, start_date, end_date, start_time, end_time, is_all_day, location, color, is_public, academic_year, semester, reminder_days, status || existingEvent[0].status, id]
    );

    // Get updated event
    const [updatedEvent] = await pool.execute(
      `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
      [id]
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
});

// DELETE /api/calendar/:id - Delete calendar event
router.delete("/:id", authenticateToken, requirePermission("manage_settings"), param("id").isInt().withMessage("Valid event ID required"), handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const [existingEvent] = await pool.execute(
      `
        SELECT * FROM academic_calendar WHERE id = ?
      `,
      [id]
    );

    if (existingEvent.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    // Soft delete by setting status to cancelled
    await pool.execute(
      `
        UPDATE academic_calendar SET status = 'cancelled', updated_at = NOW()
        WHERE id = ?
      `,
      [id]
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
});

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// GET /api/calendar/stats/overview - Calendar statistics
router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    // Total events by status
    const [statusStats] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM academic_calendar 
      GROUP BY status
    `);

    // Events by type
    const [typeStats] = await pool.execute(`
      SELECT event_type, COUNT(*) as count 
      FROM academic_calendar 
      WHERE status = 'active'
      GROUP BY event_type
    `);

    // Upcoming events count
    const [upcomingCount] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM academic_calendar 
      WHERE start_date >= CURDATE() AND status = 'active'
    `);

    // This month events
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
  [query("format").optional().isIn(["json", "ical"]).withMessage("Format must be json or ical"), query("year").optional().isInt({ min: 2020, max: 2030 }), query("public_only").optional().isBoolean(), handleValidationErrors],
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
        params.push(year);
      }

      sql += ` ORDER BY start_date ASC`;

      const [events] = await pool.execute(sql, params);

      if (format === "ical") {
        // Generate iCal format
        let icalContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//School Calendar//NONSGML v1.0//EN", "CALSCALE:GREGORIAN"];

        events.forEach((event) => {
          const startDateTime = `${event.start_date.toISOString().slice(0, 10).replace(/-/g, "")}T${(event.start_time || "00:00:00").replace(/:/g, "")}00Z`;
          const endDateTime = event.end_date ? `${event.end_date.toISOString().slice(0, 10).replace(/-/g, "")}T${(event.end_time || "23:59:59").replace(/:/g, "")}00Z` : startDateTime;

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
        res.setHeader("Content-Disposition", `attachment; filename="calendar-${year || "all"}.ics"`);
        res.send(icalContent.join("\r\n"));
      } else {
        // JSON format
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="calendar-${year || "all"}.json"`);
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

module.exports = router;
