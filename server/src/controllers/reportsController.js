import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { sendSuccess } from "../utils/response.js";

export const getDailyReport = async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);
    const { role, _id } = req.user;

    let userFilter = { isActive: true };

    // RBAC Scoping:
    // Employee: only self
    // Manager: only team members (where managerId = manager._id)
    // Admin: all users
    if (role === "employee") {
      userFilter._id = _id;
    } else if (role === "manager") {
      userFilter.$or = [{ managerId: _id }, { _id }];
    }

    const users = await User.find(userFilter).select("_id name email team");
    const userIds = users.map((u) => u._id);

    // Fetch attendance for these users on the target date
    const attendanceRecords = await Attendance.find({
      date: targetDate,
      userId: { $in: userIds },
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach((att) => {
      attendanceMap.set(att.userId.toString(), att);
    });

    // Combine users and attendance into comprehensive report rows
    const reportData = users.map((user) => {
      const att = attendanceMap.get(user._id.toString());
      return {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        team: user.team,
        date: targetDate,
        punchInTime: att && att.punchIn ? att.punchIn.time.toISOString() : "",
        punchOutTime: att && att.punchOut ? att.punchOut.time.toISOString() : "",
        punchInSelfie: att && att.punchIn ? att.punchIn.selfieUrl : "",
        punchOutSelfie: att && att.punchOut ? att.punchOut.selfieUrl : "",
        location: att && att.punchIn ? { lat: att.punchIn.lat, lng: att.punchIn.lng } : null,
        hours: att ? att.totalHours : 0,
        shiftStatus: att ? att.shiftStatus : "incomplete",
        validationStatus: att ? att.validation.status : "pending",
        overtimeStatus: att ? att.overtimeStatus : "none",
      };
    });

    return sendSuccess(res, reportData, `Daily report for ${targetDate}`);
  } catch (error) {
    next(error);
  }
};
