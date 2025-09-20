// src/utils/calendarHelpers.js - Calendar Validation & Utility Functions
const { pool } = require("../config/database");

class CalendarHelpers {
  // =============================================================================
  // DATE & TIME VALIDATION HELPERS
  // =============================================================================

  /**
   * Check if academic year format is valid
   * @param {string} academicYear - Format: "2024/2025"
   * @returns {boolean}
   */
  static isValidAcademicYear(academicYear) {
    const regex = /^20\d{2}\/20\d{2}$/;
    if (!regex.test(academicYear)) return false;

    const [startYear, endYear] = academicYear.split("/").map(Number);
    return endYear === startYear + 1;
  }

  /**
   * Generate academic year from date
   * @param {Date} date
   * @returns {string} Academic year format
   */
  static generateAcademicYear(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-based to 1-based

    // Academic year starts in July (month 7)
    if (month >= 7) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  }

  /**
   * Check if date is within academic year
   * @param {string} date - Date to check
   * @param {string} academicYear - Academic year "2024/2025"
   * @returns {boolean}
   */
  static isDateInAcademicYear(date, academicYear) {
    const [startYear, endYear] = academicYear.split("/").map(Number);
    const checkDate = new Date(date);
    const academicStart = new Date(startYear, 6, 1); // July 1st
    const academicEnd = new Date(endYear, 5, 30); // June 30th

    return checkDate >= academicStart && checkDate <= academicEnd;
  }

  /**
   * Validate date range
   * @param {string} startDate
   * @param {string} endDate
   * @returns {object} Validation result
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const errors = [];

    // Check if start date is in the past (for future events)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      errors.push("Start date cannot be in the past");
    }

    // Check end date if provided
    if (end) {
      if (end < start) {
        errors.push("End date must be after start date");
      }

      // Check if range is too long (more than 1 year)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 365) {
        errors.push("Event duration cannot exceed 365 days");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate time format and range
   * @param {string} startTime - HH:MM format
   * @param {string} endTime - HH:MM format
   * @returns {object} Validation result
   */
  static validateTimeRange(startTime, endTime) {
    const errors = [];

    // Time format validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (startTime && !timeRegex.test(startTime)) {
      errors.push("Invalid start time format (use HH:MM)");
    }

    if (endTime && !timeRegex.test(endTime)) {
      errors.push("Invalid end time format (use HH:MM)");
    }

    // Compare times if both are valid
    if (startTime && endTime && timeRegex.test(startTime) && timeRegex.test(endTime)) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        errors.push("End time must be after start time");
      }

      // Check minimum duration (15 minutes)
      if (endMinutes - startMinutes < 15) {
        errors.push("Event duration must be at least 15 minutes");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // =============================================================================
  // CONFLICT DETECTION
  // =============================================================================

  /**
   * Check for schedule conflicts
   * @param {object} eventData - Event to check
   * @param {number} excludeEventId - ID to exclude from conflict check
   * @returns {Promise<object>} Conflict check result
   */
  static async checkScheduleConflicts(eventData, excludeEventId = null) {
    const { start_date, end_date, start_time, end_time, location, is_all_day } = eventData;

    let sql = `
      SELECT id, title, start_date, end_date, start_time, end_time, location
      FROM academic_calendar 
      WHERE status = 'active'
        AND start_date <= ?
        AND (end_date >= ? OR end_date IS NULL)
    `;

    const params = [end_date || start_date, start_date];

    // Exclude current event if updating
    if (excludeEventId) {
      sql += ` AND id != ?`;
      params.push(excludeEventId);
    }

    // Location-based conflict check
    if (location && !is_all_day) {
      sql += ` AND location = ? AND is_all_day = FALSE`;
      params.push(location);

      // Time overlap check
      if (start_time) {
        sql += ` AND (
          (start_time <= ? AND (end_time > ? OR end_time IS NULL)) OR
          (start_time < ? AND end_time >= ?)
        )`;
        params.push(start_time, start_time, end_time || "23:59:59", end_time || start_time);
      }
    }

    try {
      const [conflicts] = await pool.execute(sql, params);

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts.map((conflict) => ({
          id: conflict.id,
          title: conflict.title,
          date: conflict.start_date,
          time: conflict.start_time,
          location: conflict.location,
        })),
      };
    } catch (error) {
      console.error("Conflict check error:", error);
      return {
        hasConflicts: false,
        conflicts: [],
        error: error.message,
      };
    }
  }

  // =============================================================================
  // EVENT CATEGORIZATION & PRIORITIES
  // =============================================================================

  /**
   * Get event type configuration
   * @returns {object} Event types with metadata
   */
  static getEventTypes() {
    return {
      academic: {
        label: "Academic",
        color: "#007bff",
        priority: 1,
        description: "Regular academic activities",
        requiresLocation: true,
      },
      exam: {
        label: "Examination",
        color: "#dc3545",
        priority: 2,
        description: "Exams and assessments",
        requiresLocation: true,
      },
      holiday: {
        label: "Holiday",
        color: "#28a745",
        priority: 3,
        description: "School holidays and breaks",
        requiresLocation: false,
      },
      registration: {
        label: "Registration",
        color: "#ffc107",
        priority: 2,
        description: "Student registration periods",
        requiresLocation: false,
      },
      orientation: {
        label: "Orientation",
        color: "#17a2b8",
        priority: 2,
        description: "Student and staff orientation",
        requiresLocation: true,
      },
      graduation: {
        label: "Graduation",
        color: "#6610f2",
        priority: 1,
        description: "Graduation ceremonies",
        requiresLocation: true,
      },
      other: {
        label: "Other",
        color: "#6c757d",
        priority: 4,
        description: "Other school events",
        requiresLocation: false,
      },
    };
  }

  /**
   * Validate event type
   * @param {string} eventType
   * @returns {boolean}
   */
  static isValidEventType(eventType) {
    return Object.keys(this.getEventTypes()).includes(eventType);
  }

  /**
   * Get semester from date
   * @param {string} date
   * @param {string} academicYear
   * @returns {string} 'ganjil' | 'genap' | 'both'
   */
  static getSemesterFromDate(date, academicYear = null) {
    const eventDate = new Date(date);
    const month = eventDate.getMonth() + 1; // 0-based to 1-based

    // Semester Ganjil: July - December
    // Semester Genap: January - June
    if (month >= 7) {
      return "ganjil";
    } else {
      return "genap";
    }
  }

  // =============================================================================
  // REMINDER & NOTIFICATION HELPERS
  // =============================================================================

  /**
   * Get events requiring reminders
   * @param {number} daysAhead - Days to look ahead
   * @returns {Promise<Array>} Events needing reminders
   */
  static async getEventsForReminder(daysAhead = 7) {
    try {
      const [events] = await pool.execute(
        `
        SELECT 
          id, title, description, event_type, start_date, start_time,
          location, reminder_days, is_public
        FROM academic_calendar 
        WHERE status = 'active'
          AND is_public = TRUE
          AND reminder_days > 0
          AND DATEDIFF(start_date, CURDATE()) <= ?
          AND DATEDIFF(start_date, CURDATE()) > 0
        ORDER BY start_date ASC
      `,
        [daysAhead]
      );

      return events.filter((event) => {
        const daysUntilEvent = Math.ceil((new Date(event.start_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilEvent <= event.reminder_days;
      });
    } catch (error) {
      console.error("Get reminder events error:", error);
      return [];
    }
  }

  /**
   * Format event for notification
   * @param {object} event
   * @returns {object} Formatted notification data
   */
  static formatEventNotification(event) {
    const eventTypes = this.getEventTypes();
    const typeInfo = eventTypes[event.event_type] || eventTypes.other;

    const startDate = new Date(event.start_date);
    const formattedDate = startDate.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeInfo = event.start_time ? ` pada ${event.start_time}` : "";

    const locationInfo = event.location ? ` di ${event.location}` : "";

    return {
      title: `Pengingat: ${event.title}`,
      message: `${typeInfo.label} "${event.title}" akan berlangsung pada ${formattedDate}${timeInfo}${locationInfo}.`,
      type: event.event_type,
      priority: typeInfo.priority,
      eventId: event.id,
      eventDate: event.start_date,
      eventTime: event.start_time,
    };
  }

  // =============================================================================
  // CALENDAR EXPORT HELPERS
  // =============================================================================

  /**
   * Generate iCal event string
   * @param {object} event
   * @returns {string} iCal VEVENT string
   */
  static generateICalEvent(event) {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : startDate;

    // Format dates for iCal (YYYYMMDDTHHMMSSZ)
    const formatDateTime = (date, time = null) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      if (time) {
        const [hours, minutes] = time.split(":");
        return `${year}${month}${day}T${hours}${minutes}00`;
      } else if (event.is_all_day) {
        return `${year}${month}${day}`;
      } else {
        return `${year}${month}${day}T000000`;
      }
    };

    const dtStart = formatDateTime(startDate, event.start_time);
    const dtEnd = formatDateTime(endDate, event.end_time || event.start_time);

    const lines = [
      "BEGIN:VEVENT",
      `UID:${event.id}@school-calendar.local`,
      `DTSTART${event.is_all_day ? ";VALUE=DATE" : ""}:${dtStart}`,
      `DTEND${event.is_all_day ? ";VALUE=DATE" : ""}:${dtEnd}`,
      `SUMMARY:${this.escapeICalText(event.title)}`,
      `DESCRIPTION:${this.escapeICalText(event.description || "")}`,
      `LOCATION:${this.escapeICalText(event.location || "")}`,
      `CATEGORIES:${event.event_type.toUpperCase()}`,
      `STATUS:${event.status.toUpperCase()}`,
      `CREATED:${new Date(event.created_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `LAST-MODIFIED:${new Date(event.updated_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      "END:VEVENT",
    ];

    return lines.join("\r\n");
  }

  /**
   * Escape text for iCal format
   * @param {string} text
   * @returns {string} Escaped text
   */
  static escapeICalText(text) {
    if (!text) return "";
    return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/\r/g, "");
  }

  // =============================================================================
  // STATISTICS & ANALYTICS
  // =============================================================================

  /**
   * Calculate calendar statistics
   * @param {string} academicYear - Optional filter by academic year
   * @returns {Promise<object>} Statistics object
   */
  static async calculateStatistics(academicYear = null) {
    try {
      let sql = `
        SELECT 
          event_type,
          status,
          COUNT(*) as count,
          MONTH(start_date) as month
        FROM academic_calendar
      `;

      const params = [];

      if (academicYear) {
        sql += ` WHERE academic_year = ?`;
        params.push(academicYear);
      }

      sql += ` GROUP BY event_type, status, MONTH(start_date)`;

      const [results] = await pool.execute(sql, params);

      // Process results into structured data
      const stats = {
        byType: {},
        byStatus: {},
        byMonth: {},
        total: 0,
      };

      results.forEach((row) => {
        // By type
        if (!stats.byType[row.event_type]) {
          stats.byType[row.event_type] = 0;
        }
        stats.byType[row.event_type] += row.count;

        // By status
        if (!stats.byStatus[row.status]) {
          stats.byStatus[row.status] = 0;
        }
        stats.byStatus[row.status] += row.count;

        // By month
        if (!stats.byMonth[row.month]) {
          stats.byMonth[row.month] = 0;
        }
        stats.byMonth[row.month] += row.count;

        stats.total += row.count;
      });

      return stats;
    } catch (error) {
      console.error("Calculate statistics error:", error);
      return {
        byType: {},
        byStatus: {},
        byMonth: {},
        total: 0,
        error: error.message,
      };
    }
  }
}

module.exports = CalendarHelpers;
