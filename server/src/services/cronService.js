import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "./socketService.js";
import logger from "../logger/logger.js";

/**
 * Scheduled job to check for incomplete punches or missing punch-outs.
 * Runs at 20:00 every weekday.
 */
export const initCronJobs = () => {
  // Run Monday-Friday at 20:00
  cron.schedule("0 20 * * 1-5", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      logger.info(`Running missed punch check for date: ${today}`);

      // Find attendance records with punchIn but missing punchOut
      const unclosedPunches = await Attendance.find({
        date: today,
        "punchIn.time": { $exists: true },
        punchOut: null,
      }).populate("userId", "name email");

      for (const record of unclosedPunches) {
        if (!record.userId) continue;

        const notif = await Notification.create({
          userId: record.userId._id,
          type: "missed_punch",
          message: `Reminder: You have an open punch-in for today (${today}) without a punch-out.`,
          metadata: { attendanceId: record._id, date: today },
        });

        emitToUser(record.userId._id, "notification", notif);
      }

      logger.info(`Missed punch check completed: notified ${unclosedPunches.length} employees.`);
    } catch (err) {
      logger.error(`Error in missed punch cron: ${err.message}`);
    }
  });

  logger.info("Cron jobs initialized (missed punch detection scheduled for 20:00 M-F)");
};
