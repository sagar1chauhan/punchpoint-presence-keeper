import { z } from "zod";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { saveSelfie } from "../services/imageService.js";
import { checkGeofence } from "../utils/haversine.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitToUser } from "../services/socketService.js";
import logger from "../logger/logger.js";

const punchSchema = z.object({
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  selfieUrl: z.string().min(1, "Selfie photo is required"),
  time: z.string().optional(),
});

const validateSchema = z.object({
  status: z.enum(["valid", "invalid"]),
  remarks: z.string().optional().default(""),
}).refine(
  (data) => data.status !== "invalid" || (data.remarks && data.remarks.trim().length > 0),
  {
    message: "Remarks are required when marking attendance as Invalid",
    path: ["remarks"],
  }
);

// Format helper
const getLocalDateString = (d = new Date()) => {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

export const punchIn = async (req, res, next) => {
  try {
    const parsed = punchSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`Punch validation error: ${JSON.stringify(parsed.error.errors)}`);
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { lat, lng, selfieUrl, time } = parsed.data;
    const punchTime = time ? new Date(time) : new Date();
    const today = getLocalDateString(punchTime);

    logger.info(`Punch-in attempt by ${req.user.name} (${req.user.email}) at coords: ${lat}, ${lng}`);

    // Geofencing verification
    const geofence = checkGeofence(lat, lng);
    if (geofence.enabled && !geofence.within) {
      logger.warn(
        `Punch-in rejected: ${geofence.distanceMeters}m from office exceeds radius ${geofence.radiusMeters}m`
      );
      return sendError(
        res,
        `Outside allowable office radius (${geofence.distanceMeters}m from office, max allowed: ${geofence.radiusMeters}m). Set ENABLE_GEOFENCE=false or click 'Simulate Office GPS' to punch.`,
        400
      );
    }

    // Check one punch-in per user per day rule
    const existing = await Attendance.findOne({ userId: req.user._id, date: today });
    if (existing) {
      logger.warn(`Punch-in rejected: user ${req.user.name} already punched in today (${today})`);
      return sendError(res, `You have already punched in for today (${today}).`, 400);
    }

    // Save selfie
    const savedSelfieUrl = await saveSelfie(selfieUrl, `in_${req.user._id}`);

    const attendance = await Attendance.create({
      userId: req.user._id,
      date: today,
      punchIn: {
        time: punchTime,
        lat,
        lng,
        selfieUrl: savedSelfieUrl,
      },
      shiftStatus: "incomplete",
      validation: {
        status: "pending",
        remarks: "",
      },
    });

    return sendSuccess(
      res,
      { recorded: true, attendance: attendance.toJSON() },
      "Punch-in recorded successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

export const punchOut = async (req, res, next) => {
  try {
    const parsed = punchSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { lat, lng, selfieUrl, time } = parsed.data;
    const punchTime = time ? new Date(time) : new Date();
    const today = getLocalDateString(punchTime);

    // Geofencing verification
    const geofence = checkGeofence(lat, lng);
    if (geofence.enabled && !geofence.within) {
      return sendError(
        res,
        `Outside allowable office radius (${geofence.distanceMeters}m from office, max allowed: ${geofence.radiusMeters}m)`,
        400
      );
    }

    // Find open attendance record for today
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
      "punchIn.time": { $exists: true },
      punchOut: null,
    });

    if (!attendance) {
      return sendError(
        res,
        "No open punch-in found for today. You must punch in first before punching out.",
        400
      );
    }

    // Save selfie
    const savedSelfieUrl = await saveSelfie(selfieUrl, `out_${req.user._id}`);

    // Compute total hours
    const punchInMs = new Date(attendance.punchIn.time).getTime();
    const punchOutMs = punchTime.getTime();
    const diffHours = Math.max(0, (punchOutMs - punchInMs) / (1000 * 60 * 60));
    const totalHours = Math.round(diffHours * 100) / 100;
    const shiftStatus = totalHours >= 8 ? "completed" : "incomplete";

    attendance.punchOut = {
      time: punchTime,
      lat,
      lng,
      selfieUrl: savedSelfieUrl,
    };
    attendance.totalHours = totalHours;
    attendance.shiftStatus = shiftStatus;

    await attendance.save();

    return sendSuccess(
      res,
      { recorded: true, attendance: attendance.toJSON() },
      `Punch-out recorded. Total shift: ${totalHours}h (${shiftStatus === "completed" ? "Completed shift >= 8h" : "Incomplete shift < 8h"}).`
    );
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user._id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1, "punchIn.time": -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email team")
        .populate("validation.validatedBy", "name email"),
      Attendance.countDocuments(filter),
    ]);

    const formatted = records.map((r) => {
      const obj = r.toJSON();
      obj.user = r.userId
        ? { id: r.userId._id, name: r.userId.name, email: r.userId.email, team: r.userId.team }
        : undefined;
      return obj;
    });

    return sendSuccess(res, formatted, "Attendance records fetched", 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamAttendance = async (req, res, next) => {
  try {
    // Manager sees team: users where managerId = req.user._id
    const teamMembers = await User.find({ managerId: req.user._id }).select("_id name email team");
    const teamUserIds = teamMembers.map((m) => m._id);

    // Also include the manager themselves if desired, but primarily team
    const { date, status, page = 1, limit = 50 } = req.query;
    const filter = { userId: { $in: teamUserIds } };

    if (date) filter.date = date;
    if (status) filter.shiftStatus = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1, "punchIn.time": -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email team")
        .populate("validation.validatedBy", "name email"),
      Attendance.countDocuments(filter),
    ]);

    const formatted = records.map((r) => {
      const obj = r.toJSON();
      obj.user = r.userId
        ? { id: r.userId._id, name: r.userId.name, email: r.userId.email, team: r.userId.team }
        : undefined;
      return obj;
    });

    return sendSuccess(res, formatted, "Team attendance records fetched", 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAttendance = async (req, res, next) => {
  try {
    const { date, userId, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (date) filter.date = date;
    if (userId) filter.userId = userId;
    if (status) filter.shiftStatus = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1, "punchIn.time": -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email team")
        .populate("validation.validatedBy", "name email"),
      Attendance.countDocuments(filter),
    ]);

    const formatted = records.map((r) => {
      const obj = r.toJSON();
      obj.user = r.userId
        ? { id: r.userId._id, name: r.userId.name, email: r.userId.email, team: r.userId.team }
        : undefined;
      return obj;
    });

    return sendSuccess(res, formatted, "All attendance records fetched", 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const validateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = validateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { status, remarks } = parsed.data;

    const attendance = await Attendance.findById(id).populate("userId", "name email managerId");
    if (!attendance) {
      return sendError(res, "Attendance record not found", 404);
    }

    // Role check: Manager can only validate their team
    if (req.user.role === "manager") {
      const isTeamMember =
        attendance.userId &&
        attendance.userId.managerId &&
        attendance.userId.managerId.toString() === req.user._id.toString();
      if (!isTeamMember) {
        return sendError(res, "Managers can only validate attendance for their own team members.", 403);
      }
    }

    attendance.validation = {
      status,
      remarks: remarks || "",
      validatedBy: req.user._id,
      validatedAt: new Date(),
    };

    await attendance.save();

    // Create notification for employee
    if (attendance.userId) {
      const notif = await Notification.create({
        userId: attendance.userId._id,
        type: "attendance_validated",
        message: `Your attendance for ${attendance.date} was marked as ${status.toUpperCase()} by ${req.user.name}.${remarks ? ` Notes: "${remarks}"` : ""}`,
        metadata: { attendanceId: attendance._id, status, remarks },
      });

      emitToUser(attendance.userId._id, "notification", notif);
    }

    const populated = await Attendance.findById(id)
      .populate("userId", "name email team")
      .populate("validation.validatedBy", "name email");

    const obj = populated.toJSON();
    obj.user = populated.userId
      ? { id: populated.userId._id, name: populated.userId.name, email: populated.userId.email }
      : undefined;

    return sendSuccess(res, obj, `Attendance successfully marked as ${status}`);
  } catch (error) {
    next(error);
  }
};
