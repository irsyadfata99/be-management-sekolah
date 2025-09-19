// src/routes/calendar.js - Academic Calendar Management System
const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

// Database migration for academic calendar (run this first)
const createCalendarTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS academic_calendar (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type ENUM('academic', 'exam', 'holiday', 'registration', 'orientation', 'graduation', 'other') DEFAULT 'academic',
        start_date DATE NOT NULL,
        end_date DATE,
        start_time TIME,
        end_time TIME,
        is_all_day BOOLEAN DEFAULT FALSE,
        location VARCHAR(255),
        color VARCHAR(7) DEFAULT '#007bff',
        is_public BOOLEAN DEFAULT TRUE,
        academic_year VARCHAR(10) NOT NULL,
        semester ENUM('ganjil', 'genap', 'both') DEFAULT 'both',
        created_by INT,
        status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
        reminder_days INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_start_date (start_date),
        INDEX idx_academic_year (academic_year),
        INDEX idx_event_type (event_type),
        INDEX idx_status (status)
      )
    `);
    console.log("✅ Academic calendar table ensured");
  } catch (error) {
    console.error("❌ Error creating calendar table:", error);
  }
};

// Initialize table on module load
createCalendarTable();

// GET /api/calendar - Final fix using pool.query
router.get("/", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, status, reminder_days,
        created_at, updated_at
      FROM academic_calendar 
      ORDER BY start_date ASC 
      LIMIT ${parseInt(limit)}
    `;

    console.log("Final calendar query:", query);

    // Use pool.query instead of pool.execute to avoid prepared statement issue
    const [events] = await pool.query(query);

    res.json({
      success: true,
      message: "Academic calendar events retrieved successfully",
      data: events,
      total: events.length,
    });
  } catch (error) {
    console.error("Get calendar error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events",
      error: error.message,
    });
  }
});

// GET /api/calendar/:id - Get specific calendar event
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await pool.execute(
      "SELECT * FROM academic_calendar WHERE id = ?",
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
      data: events[0],
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

// POST /api/calendar - Create new calendar event
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      event_type = "academic",
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day = false,
      location,
      color = "#007bff",
      is_public = true,
      academic_year,
      semester = "both",
      reminder_days = 0,
    } = req.body;

    // Validation
    if (!title || !start_date || !academic_year) {
      return res.status(400).json({
        success: false,
        message: "Title, start_date, and academic_year are required",
      });
    }

    // Validate date format
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start_date format",
      });
    }

    // Validate end_date if provided
    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid end_date format",
        });
      }
      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }
    }

    const [result] = await pool.execute(
      `
      INSERT INTO academic_calendar (
        title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        is_public, academic_year, semester, reminder_days,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        title,
        description || null,
        event_type,
        start_date,
        end_date || null,
        start_time || null,
        end_time || null,
        is_all_day,
        location || null,
        color,
        is_public,
        academic_year,
        semester,
        reminder_days,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Calendar event created successfully",
      data: {
        id: result.insertId,
        title,
        event_type,
        start_date,
        end_date,
        academic_year,
        semester,
        created_at: new Date().toISOString(),
      },
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

// PUT /api/calendar/:id - Update calendar event
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      event_type,
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day,
      location,
      color,
      is_public,
      academic_year,
      semester,
      status,
      reminder_days,
    } = req.body;

    // Check if event exists
    const [existingEvent] = await pool.execute(
      "SELECT id FROM academic_calendar WHERE id = ?",
      [id]
    );

    if (existingEvent.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }
    if (event_type !== undefined) {
      updateFields.push("event_type = ?");
      updateValues.push(event_type);
    }
    if (start_date !== undefined) {
      updateFields.push("start_date = ?");
      updateValues.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push("end_date = ?");
      updateValues.push(end_date || null);
    }
    if (start_time !== undefined) {
      updateFields.push("start_time = ?");
      updateValues.push(start_time || null);
    }
    if (end_time !== undefined) {
      updateFields.push("end_time = ?");
      updateValues.push(end_time || null);
    }
    if (is_all_day !== undefined) {
      updateFields.push("is_all_day = ?");
      updateValues.push(is_all_day);
    }
    if (location !== undefined) {
      updateFields.push("location = ?");
      updateValues.push(location);
    }
    if (color !== undefined) {
      updateFields.push("color = ?");
      updateValues.push(color);
    }
    if (is_public !== undefined) {
      updateFields.push("is_public = ?");
      updateValues.push(is_public);
    }
    if (academic_year !== undefined) {
      updateFields.push("academic_year = ?");
      updateValues.push(academic_year);
    }
    if (semester !== undefined) {
      updateFields.push("semester = ?");
      updateValues.push(semester);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }
    if (reminder_days !== undefined) {
      updateFields.push("reminder_days = ?");
      updateValues.push(reminder_days);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(id);

    const [result] = await pool.execute(
      `UPDATE academic_calendar SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: "Calendar event updated successfully",
      data: {
        id: parseInt(id),
        updated_fields: updateFields.length - 1,
        updated_at: new Date().toISOString(),
      },
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM academic_calendar WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    res.json({
      success: true,
      message: "Calendar event deleted successfully",
      data: {
        id: parseInt(id),
        deleted_at: new Date().toISOString(),
      },
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

// GET /api/calendar/public/events - Get public calendar events (no auth required)
router.get("/public/events", async (req, res) => {
  try {
    const {
      academic_year = new Date().getFullYear(),
      limit = 50,
      upcoming = "true",
    } = req.query;

    let query = `
      SELECT 
        id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, location, color,
        academic_year, semester
      FROM academic_calendar 
      WHERE is_public = TRUE AND status = 'active'
    `;

    const queryParams = [];

    if (academic_year) {
      query += " AND academic_year = ?";
      queryParams.push(academic_year);
    }

    if (upcoming === "true") {
      query += " AND start_date >= CURDATE()";
    }

    query += " ORDER BY start_date ASC, start_time ASC LIMIT ?";
    queryParams.push(parseInt(limit));

    const [events] = await pool.execute(query, queryParams);

    res.json({
      success: true,
      message: "Public calendar events retrieved successfully",
      data: events,
      academic_year: academic_year,
      total_events: events.length,
    });
  } catch (error) {
    console.error("Get public calendar error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve public calendar events",
      error: error.message,
    });
  }
});

// GET /api/calendar/stats - Get calendar statistics
router.get("/admin/stats", async (req, res) => {
  try {
    const { academic_year } = req.query;

    // Basic statistics
    let statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_events,
        COUNT(CASE WHEN is_public = TRUE THEN 1 END) as public_events,
        COUNT(CASE WHEN start_date >= CURDATE() THEN 1 END) as upcoming_events
      FROM academic_calendar
    `;

    const queryParams = [];
    if (academic_year) {
      statsQuery += " WHERE academic_year = ?";
      queryParams.push(academic_year);
    }

    const [stats] = await pool.execute(statsQuery, queryParams);

    // Event type distribution
    let typeQuery = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
      FROM academic_calendar
    `;

    if (academic_year) {
      typeQuery += " WHERE academic_year = ?";
    }

    typeQuery += " GROUP BY event_type ORDER BY count DESC";

    const [typeStats] = await pool.execute(typeQuery, queryParams);

    // Monthly distribution
    let monthlyQuery = `
      SELECT 
        MONTH(start_date) as month,
        COUNT(*) as event_count
      FROM academic_calendar
      WHERE status = 'active'
    `;

    if (academic_year) {
      monthlyQuery += " AND academic_year = ?";
    }

    monthlyQuery += " GROUP BY MONTH(start_date) ORDER BY month";

    const [monthlyStats] = await pool.execute(monthlyQuery, queryParams);

    res.json({
      success: true,
      message: "Calendar statistics retrieved successfully",
      data: {
        overview: stats[0],
        by_type: typeStats,
        by_month: monthlyStats,
        academic_year: academic_year || "all",
      },
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

// POST /api/calendar/bulk - Create multiple calendar events
router.post("/bulk", async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Events array is required and cannot be empty",
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        // Validate required fields
        if (!event.title || !event.start_date || !event.academic_year) {
          errors.push({
            index: i,
            event: event.title || "Unnamed Event",
            error: "Missing required fields: title, start_date, academic_year",
          });
          continue;
        }

        const [result] = await pool.execute(
          `
          INSERT INTO academic_calendar (
            title, description, event_type, start_date, end_date,
            start_time, end_time, is_all_day, location, color,
            is_public, academic_year, semester, reminder_days,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
          [
            event.title,
            event.description || null,
            event.event_type || "academic",
            event.start_date,
            event.end_date || null,
            event.start_time || null,
            event.end_time || null,
            event.is_all_day || false,
            event.location || null,
            event.color || "#007bff",
            event.is_public !== undefined ? event.is_public : true,
            event.academic_year,
            event.semester || "both",
            event.reminder_days || 0,
          ]
        );

        results.push({
          index: i,
          id: result.insertId,
          title: event.title,
          status: "created",
        });
      } catch (error) {
        errors.push({
          index: i,
          event: event.title || "Unnamed Event",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk creation completed. ${results.length} events created, ${errors.length} errors`,
      data: {
        created: results,
        errors: errors,
        summary: {
          total_events: events.length,
          created_count: results.length,
          error_count: errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Bulk create calendar events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create calendar events in bulk",
      error: error.message,
    });
  }
});

// GET /api/calendar/export - Export calendar events as JSON
router.get("/export", async (req, res) => {
  try {
    const { academic_year, format = "json" } = req.query;

    let query = 'SELECT * FROM academic_calendar WHERE status = "active"';
    const queryParams = [];

    if (academic_year) {
      query += " AND academic_year = ?";
      queryParams.push(academic_year);
    }

    query += " ORDER BY start_date ASC";

    const [events] = await pool.execute(query, queryParams);

    if (format === "ical") {
      // Simple iCal format export
      let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SPMB System//Academic Calendar//EN
CALSCALE:GREGORIAN\n`;

      events.forEach((event) => {
        icalContent += `BEGIN:VEVENT
UID:${event.id}@spmb-system
DTSTART:${event.start_date.toISOString().replace(/[-:]/g, "").split("T")[0]}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location || ""}
STATUS:CONFIRMED
END:VEVENT\n`;
      });

      icalContent += "END:VCALENDAR";

      res.setHeader("Content-Type", "text/calendar");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="academic_calendar_${academic_year || "all"}.ics"`
      );
      res.send(icalContent);
    } else {
      // JSON export (default)
      const exportData = {
        export_date: new Date().toISOString(),
        academic_year: academic_year || "all",
        total_events: events.length,
        events: events,
      };

      res.json({
        success: true,
        message: "Calendar events exported successfully",
        data: exportData,
      });
    }
  } catch (error) {
    console.error("Export calendar error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export calendar events",
      error: error.message,
    });
  }
});

module.exports = router;
