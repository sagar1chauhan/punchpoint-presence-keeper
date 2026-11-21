import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import OvertimeRequest from "../models/OvertimeRequest.js";
import Notification from "../models/Notification.js";
import logger from "../logger/logger.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/punchpoint";

const SAMPLE_SELFIES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
];

async function seed() {
  try {
    logger.info(`Connecting to MongoDB for seeding: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);

    logger.info("Cleaning existing collections...");
    await Promise.all([
      User.deleteMany({}),
      Attendance.deleteMany({}),
      OvertimeRequest.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    const defaultPassword = "Password123!";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    logger.info("Creating users: 1 Admin, 2 Managers, 6 Employees...");

    // 1 Admin
    const admin = await User.create({
      name: "Avery Patel",
      email: "avery@punchpoint.demo",
      passwordHash,
      role: "admin",
      team: "People Operations",
    });

    // 2 Managers
    const manager1 = await User.create({
      name: "Marcus Reed",
      email: "marcus@punchpoint.demo",
      passwordHash,
      role: "manager",
      team: "Product Engineering",
    });

    const manager2 = await User.create({
      name: "Elena Rostova",
      email: "elena@punchpoint.demo",
      passwordHash,
      role: "manager",
      team: "Customer Experience",
    });

    // 6 Employees (3 per manager)
    const employees = await User.create([
      {
        name: "Sofia Chen",
        email: "sofia@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager1._id,
        team: "Product Engineering",
      },
      {
        name: "David Kim",
        email: "david@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager1._id,
        team: "Product Engineering",
      },
      {
        name: "Aisha Morales",
        email: "aisha@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager1._id,
        team: "Product Engineering",
      },
      {
        name: "James Wilson",
        email: "james@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager2._id,
        team: "Customer Experience",
      },
      {
        name: "Priya Sharma",
        email: "priya@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager2._id,
        team: "Customer Experience",
      },
      {
        name: "Lucas Silva",
        email: "lucas@punchpoint.demo",
        passwordHash,
        role: "employee",
        managerId: manager2._id,
        team: "Customer Experience",
      },
    ]);

    logger.info("Generating 30 days of realistic attendance history...");
    const allEmployees = [...employees, manager1, manager2];
    const today = new Date();

    const attendanceToInsert = [];
    const overtimeToInsert = [];
    const notificationsToInsert = [];

    // Base coordinates around office (New Delhi Connaught Place coordinates as default)
    const BASE_LAT = 28.6139;
    const BASE_LNG = 77.209;

    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - dayOffset);

      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = currentDate.toISOString().slice(0, 10);

      for (let empIdx = 0; empIdx < allEmployees.length; empIdx++) {
        const emp = allEmployees[empIdx];

        // 95% attendance probability
        if (Math.random() < 0.05 && dayOffset > 0) continue;

        // Morning punch-in between 08:35 and 09:30
        const inHour = 8 + (Math.random() > 0.4 ? 0 : 1);
        const inMinute = Math.floor(Math.random() * 59);
        const punchInTime = new Date(currentDate);
        punchInTime.setHours(inHour, inMinute, Math.floor(Math.random() * 59));

        // Shift duration between 7.0 and 9.5 hours
        // For today (dayOffset === 0), Sofia has punched in but not out yet, simulating live working day
        const isToday = dayOffset === 0;
        const isSofia = emp.email === "sofia@punchpoint.demo";

        let punchOut = null;
        let totalHours = 0;
        let shiftStatus = "incomplete";

        if (!(isToday && isSofia)) {
          const shiftDurationHours = 7.2 + Math.random() * 2.1; // 7.2h to 9.3h
          totalHours = Math.round(shiftDurationHours * 10) / 10;
          shiftStatus = totalHours >= 8.0 ? "completed" : "incomplete";

          const punchOutTime = new Date(punchInTime.getTime() + totalHours * 3600 * 1000);
          punchOut = {
            time: punchOutTime,
            lat: BASE_LAT + (Math.random() - 0.5) * 0.002,
            lng: BASE_LNG + (Math.random() - 0.5) * 0.002,
            selfieUrl: SAMPLE_SELFIES[(empIdx + 1) % SAMPLE_SELFIES.length],
          };
        }

        // Validation status
        let validationStatus = "valid";
        let remarks = "";
        let validatedBy = emp.managerId || admin._id;
        let validatedAt = new Date(currentDate);
        validatedAt.setHours(18, 30);

        if (isToday) {
          validationStatus = "pending";
          validatedBy = null;
          validatedAt = null;
        } else if (dayOffset === 5 && empIdx === 1) {
          validationStatus = "invalid";
          remarks = "Selfie was obscured and location jittered outside bounds.";
        }

        // Overtime check
        let overtimeStatus = "none";
        if (totalHours > 8.5 && !isToday) {
          overtimeStatus = dayOffset < 3 ? "pending" : dayOffset % 2 === 0 ? "approved" : "rejected";
        }

        const attendanceRecord = {
          _id: new mongoose.Types.ObjectId(),
          userId: emp._id,
          date: dateStr,
          punchIn: {
            time: punchInTime,
            lat: BASE_LAT + (Math.random() - 0.5) * 0.002,
            lng: BASE_LNG + (Math.random() - 0.5) * 0.002,
            selfieUrl: SAMPLE_SELFIES[empIdx % SAMPLE_SELFIES.length],
          },
          punchOut,
          totalHours,
          shiftStatus,
          validation: {
            status: validationStatus,
            remarks,
            validatedBy,
            validatedAt,
          },
          overtimeStatus,
        };

        attendanceToInsert.push(attendanceRecord);

        // If overtime was requested, add OvertimeRequest
        if (overtimeStatus !== "none") {
          const otHours = Math.round((totalHours - 8.0) * 10) / 10;
          overtimeToInsert.push({
            attendanceId: attendanceRecord._id,
            userId: emp._id,
            date: dateStr,
            hours: otHours,
            reason: `Extended sprint deadline delivery on ${dateStr}`,
            status: overtimeStatus,
            reviewedBy: overtimeStatus === "pending" ? null : (emp.managerId || admin._id),
            reviewNote: overtimeStatus === "approved" ? "Approved, thanks for the hard work." : overtimeStatus === "rejected" ? "Overtime was not pre-authorized." : "",
          });
        }
      }
    }

    await Attendance.insertMany(attendanceToInsert);
    logger.info(`Inserted ${attendanceToInsert.length} attendance records`);

    if (overtimeToInsert.length > 0) {
      await OvertimeRequest.insertMany(overtimeToInsert);
      logger.info(`Inserted ${overtimeToInsert.length} overtime requests`);
    }

    // Seed realistic notifications for Sofia
    notificationsToInsert.push(
      {
        userId: employees[0]._id,
        type: "overtime_approved",
        message: "Your 1.2h overtime request for 2026-11-18 was APPROVED by Marcus Reed.",
        read: false,
      },
      {
        userId: employees[0]._id,
        type: "attendance_validated",
        message: "Your attendance for 2026-11-19 was verified and marked VALID.",
        read: true,
      },
      {
        userId: manager1._id,
        type: "system",
        message: "Sofia Chen submitted an overtime request for 1.2h pending your review.",
        read: false,
      }
    );

    await Notification.insertMany(notificationsToInsert);
    logger.info(`Inserted sample notifications`);

    logger.info("=== SEEDING COMPLETED SUCCESSFULLY ===");
    logger.info(`Demo Accounts:`);
    logger.info(`- Admin:   avery@punchpoint.demo   / Password123!`);
    logger.info(`- Manager: marcus@punchpoint.demo  / Password123!`);
    logger.info(`- Manager: elena@punchpoint.demo   / Password123!`);
    logger.info(`- Employee: sofia@punchpoint.demo  / Password123!`);
    logger.info(`- Employee: david@punchpoint.demo  / Password123!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
}

seed();
