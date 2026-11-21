import { z } from "zod";
import OvertimeRequest from "../models/OvertimeRequest.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitToUser } from "../services/socketService.js";

const overtimeRequestSchema = z.object({
  attendanceId: z.string().min(1, "Attendance ID is required"),
  hours: z.number().min(0.1, "Hours must be greater than 0"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  date: z.string().optional(),
});

const reviewOvertimeSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional().default(""),
});

export const createOvertime = async (req, res, next) => {
  try {
    const parsed = overtimeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { attendanceId, hours, reason, date: clientDate } = parsed.data;

    // Verify attendance belongs to user
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      userId: req.user._id,
    });

    if (!attendance) {
      return sendError(res, "Attendance record not found for this user", 404);
    }

    if (attendance.overtimeStatus === "approved") {
      return sendError(res, "Overtime for this attendance record is already approved", 400);
    }

    if (attendance.overtimeStatus === "pending") {
      return sendError(res, "An overtime request for this shift is already pending review", 400);
    }

    const otDate = clientDate || attendance.date;

    const request = await OvertimeRequest.create({
      attendanceId: attendance._id,
      userId: req.user._id,
      date: otDate,
      hours: Math.round(hours * 10) / 10,
      reason,
      status: "pending",
    });

    // Sync status to attendance record
    attendance.overtimeStatus = "pending";
    await attendance.save();

    // Notify employee's manager if exists
    if (req.user.managerId) {
      const managerNotif = await Notification.create({
        userId: req.user.managerId,
        type: "system",
        message: `${req.user.name} requested ${hours}h overtime for ${otDate}: "${reason}"`,
        metadata: { overtimeId: request._id, attendanceId: attendance._id },
      });
      emitToUser(req.user.managerId, "notification", managerNotif);
    }

    return sendSuccess(res, request.toJSON(), "Overtime request submitted", 201);
  } catch (error) {
    next(error);
  }
};

export const getMyOvertime = async (req, res, next) => {
  try {
    const requests = await OvertimeRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email");

    return sendSuccess(res, requests.map((r) => r.toJSON()), "User overtime requests fetched");
  } catch (error) {
    next(error);
  }
};

export const getPendingOvertime = async (req, res, next) => {
  try {
    let filter = { status: "pending" };

    if (req.user.role === "manager") {
      // Find team members
      const teamMembers = await User.find({ managerId: req.user._id }).select("_id");
      const teamIds = teamMembers.map((m) => m._id);
      filter.userId = { $in: teamIds };
    }

    const requests = await OvertimeRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email team")
      .populate("reviewedBy", "name email");

    const formatted = requests.map((r) => {
      const obj = r.toJSON();
      obj.user = r.userId
        ? { id: r.userId._id, name: r.userId.name, email: r.userId.email }
        : undefined;
      return obj;
    });

    return sendSuccess(res, formatted, "Pending overtime requests fetched");
  } catch (error) {
    next(error);
  }
};

export const reviewOvertime = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = reviewOvertimeSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { status, reviewNote } = parsed.data;

    const request = await OvertimeRequest.findById(id).populate("userId", "name email managerId");
    if (!request) {
      return sendError(res, "Overtime request not found", 404);
    }

    // Role check: Manager can only review team members
    if (req.user.role === "manager") {
      const isTeam =
        request.userId &&
        request.userId.managerId &&
        request.userId.managerId.toString() === req.user._id.toString();
      if (!isTeam) {
        return sendError(res, "Managers can only review overtime for their own team members.", 403);
      }
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewNote = reviewNote || "";
    await request.save();

    // Write back status to attendance record
    const attendance = await Attendance.findById(request.attendanceId);
    if (attendance) {
      attendance.overtimeStatus = status;
      await attendance.save();
    }

    // Create notification for employee
    if (request.userId) {
      const notif = await Notification.create({
        userId: request.userId._id,
        type: status === "approved" ? "overtime_approved" : "overtime_rejected",
        message: `Your ${request.hours}h overtime request for ${request.date} was ${status.toUpperCase()} by ${req.user.name}.${reviewNote ? ` Note: "${reviewNote}"` : ""}`,
        metadata: { overtimeId: request._id, status, reviewNote },
      });
      emitToUser(request.userId._id, "notification", notif);
    }

    return sendSuccess(res, request.toJSON(), `Overtime request ${status}`);
  } catch (error) {
    next(error);
  }
};
