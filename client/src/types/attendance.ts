export type UserRole = "employee" | "manager" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  team: string;
  managerId?: string | null;
  isActive?: boolean;
}

export type ValidationStatus = "pending" | "valid" | "invalid";
export type OvertimeStatus = "none" | "pending" | "approved" | "rejected";
export type ShiftStatus = "completed" | "incomplete";

export interface PunchLocation {
  time: string;
  lat: number;
  lng: number;
  selfieUrl: string;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  user?: {
    id?: string;
    name: string;
    email: string;
    team?: string;
  };
  date: string;
  day: string;
  punchIn: string | PunchLocation;
  punchOut: string | PunchLocation | null;
  punchInFormatted?: string;
  punchOutFormatted?: string;
  hours: number;
  totalHours?: number;
  shiftStatus: ShiftStatus;
  validationStatus: ValidationStatus;
  overtimeStatus: OvertimeStatus;
  validation?: {
    status: ValidationStatus;
    remarks: string;
    validatedBy?: string | { id?: string; name: string } | null;
    validatedAt?: string | null;
  };
}

export interface OvertimeRequest {
  id: string;
  attendanceId: string;
  userId: string;
  user?: {
    id?: string;
    name: string;
    email: string;
  };
  date: string;
  hours: number;
  reason: string;
  status: Exclude<OvertimeStatus, "none">;
  reviewedBy?: string | { id?: string; name: string } | null;
  reviewNote?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    "overtime_approved" | "overtime_rejected" | "attendance_validated" | "missed_punch" | "system";
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DailyReportItem {
  userId: string;
  name: string;
  email: string;
  team: string;
  date: string;
  punchInTime: string;
  punchOutTime: string;
  punchInSelfie: string;
  punchOutSelfie: string;
  location: { lat: number; lng: number } | null;
  hours: number;
  shiftStatus: ShiftStatus;
  validationStatus: ValidationStatus;
  overtimeStatus: OvertimeStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { page: number; limit: number; total: number; totalPages?: number };
}

export interface AuthPayload {
  token: string;
  user: User;
}

export function getShiftStatus(hours: number): ShiftStatus {
  return hours >= 8 ? "completed" : "incomplete";
}
