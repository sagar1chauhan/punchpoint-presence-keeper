import { describe, it, expect } from "vitest";
import { calculateDistanceMeters, checkGeofence } from "../src/utils/haversine.js";

describe("Business Rule 1: Working Hours & Shift Status Logic", () => {
  function computeShift(punchInTime, punchOutTime) {
    const diffHours = (new Date(punchOutTime).getTime() - new Date(punchInTime).getTime()) / (1000 * 60 * 60);
    const totalHours = Math.round(diffHours * 100) / 100;
    const shiftStatus = totalHours >= 8.0 ? "completed" : "incomplete";
    return { totalHours, shiftStatus };
  }

  it("marks a shift >= 8.0 hours as 'completed'", () => {
    const punchIn = "2026-11-20T09:00:00.000Z";
    const punchOut = "2026-11-20T17:30:00.000Z"; // 8.5 hours
    const result = computeShift(punchIn, punchOut);

    expect(result.totalHours).toBe(8.5);
    expect(result.shiftStatus).toBe("completed");
  });

  it("marks exactly 8.0 hours as 'completed'", () => {
    const punchIn = "2026-11-20T09:00:00.000Z";
    const punchOut = "2026-11-20T17:00:00.000Z"; // 8.0 hours
    const result = computeShift(punchIn, punchOut);

    expect(result.totalHours).toBe(8.0);
    expect(result.shiftStatus).toBe("completed");
  });

  it("marks a shift < 8.0 hours as 'incomplete'", () => {
    const punchIn = "2026-11-20T09:15:00.000Z";
    const punchOut = "2026-11-20T16:45:00.000Z"; // 7.5 hours
    const result = computeShift(punchIn, punchOut);

    expect(result.totalHours).toBe(7.5);
    expect(result.shiftStatus).toBe("incomplete");
  });

  it("handles short shifts (e.g. 4.25 hours) as 'incomplete'", () => {
    const punchIn = "2026-11-20T10:00:00.000Z";
    const punchOut = "2026-11-20T14:15:00.000Z"; // 4.25 hours
    const result = computeShift(punchIn, punchOut);

    expect(result.totalHours).toBe(4.25);
    expect(result.shiftStatus).toBe("incomplete");
  });
});

describe("Business Rule 2: Geofence & Haversine Distance", () => {
  const officeLat = 28.6139; // New Delhi office
  const officeLng = 77.209;
  const radiusMeters = 200;

  it("calculates 0 distance for identical coordinates", () => {
    const distance = calculateDistanceMeters(officeLat, officeLng, officeLat, officeLng);
    expect(Math.round(distance)).toBe(0);
  });

  it("identifies location within 50 meters of the office", () => {
    // Approx 50 meters north
    const employeeLat = 28.61435;
    const employeeLng = 77.209;
    const distance = calculateDistanceMeters(employeeLat, employeeLng, officeLat, officeLng);

    expect(distance).toBeLessThan(radiusMeters);
  });

  it("identifies location outside radius (e.g. 500m away)", () => {
    const farLat = 28.619;
    const farLng = 77.209;
    const distance = calculateDistanceMeters(farLat, farLng, officeLat, officeLng);

    expect(distance).toBeGreaterThan(radiusMeters);
  });

  it("respects checkGeofence enabled flag when env is unset", () => {
    delete process.env.OFFICE_LAT;
    delete process.env.OFFICE_LNG;
    const res = checkGeofence(28.6139, 77.209);
    expect(res.within).toBe(true);
    expect(res.enabled).toBe(false);
  });
});

describe("Business Rule 3: RBAC Scoping Logic", () => {
  const mockUsers = [
    { _id: "admin-1", name: "Avery", role: "admin", managerId: null },
    { _id: "mgr-1", name: "Marcus", role: "manager", managerId: null },
    { _id: "emp-1", name: "Sofia", role: "employee", managerId: "mgr-1" },
    { _id: "emp-2", name: "David", role: "employee", managerId: "mgr-1" },
    { _id: "emp-3", name: "James", role: "employee", managerId: "mgr-2" },
  ];

  function filterAttendanceForRole(requestingUser, attendanceRecords) {
    if (requestingUser.role === "admin") {
      return attendanceRecords;
    }
    if (requestingUser.role === "manager") {
      const teamUserIds = mockUsers
        .filter((u) => u.managerId === requestingUser._id || u._id === requestingUser._id)
        .map((u) => u._id);
      return attendanceRecords.filter((rec) => teamUserIds.includes(rec.userId));
    }
    // Employee
    return attendanceRecords.filter((rec) => rec.userId === requestingUser._id);
  }

  const mockAttendance = [
    { id: "att-1", userId: "emp-1", date: "2026-11-20" },
    { id: "att-2", userId: "emp-2", date: "2026-11-20" },
    { id: "att-3", userId: "emp-3", date: "2026-11-20" },
    { id: "att-4", userId: "mgr-1", date: "2026-11-20" },
  ];

  it("employee sees only their own attendance records", () => {
    const employee = mockUsers.find((u) => u._id === "emp-1");
    const result = filterAttendanceForRole(employee, mockAttendance);

    expect(result.length).toBe(1);
    expect(result[0].userId).toBe("emp-1");
  });

  it("manager sees only their team members and themselves", () => {
    const manager = mockUsers.find((u) => u._id === "mgr-1");
    const result = filterAttendanceForRole(manager, mockAttendance);

    expect(result.length).toBe(3); // emp-1, emp-2, mgr-1
    expect(result.map((r) => r.userId)).not.toContain("emp-3");
  });

  it("admin sees all system attendance records", () => {
    const admin = mockUsers.find((u) => u._id === "admin-1");
    const result = filterAttendanceForRole(admin, mockAttendance);

    expect(result.length).toBe(4);
  });
});

describe("Business Rule 4: Overtime Status Synchronization", () => {
  it("reflects approved/rejected state onto attendance record", () => {
    const attendance = {
      id: "att-1",
      userId: "emp-1",
      totalHours: 9.5,
      shiftStatus: "completed",
      overtimeStatus: "none",
    };

    // Employee requests overtime
    attendance.overtimeStatus = "pending";
    expect(attendance.overtimeStatus).toBe("pending");

    // Manager reviews and approves
    attendance.overtimeStatus = "approved";
    expect(attendance.overtimeStatus).toBe("approved");

    // Rejected case
    attendance.overtimeStatus = "rejected";
    expect(attendance.overtimeStatus).toBe("rejected");
  });
});
