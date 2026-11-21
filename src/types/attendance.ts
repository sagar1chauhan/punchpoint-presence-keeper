export type UserRole = "employee" | "manager" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  team: string;
}

export type ValidationStatus = "pending" | "valid" | "invalid";
export type OvertimeStatus = "none" | "pending" | "approved" | "rejected";
export type ShiftStatus = "completed" | "incomplete";

export interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  punchIn: string;
  punchOut: string | null;
  hours: number;
  shiftStatus: ShiftStatus;
  validationStatus: ValidationStatus;
  overtimeStatus: OvertimeStatus;
}

export interface OvertimeRequest {
  id: string;
  date: string;
  hours: number;
  reason: string;
  status: Exclude<OvertimeStatus, "none">;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { page: number; limit: number; total: number };
}

export interface AuthPayload {
  token: string;
  user: User;
}

export function getShiftStatus(hours: number): ShiftStatus {
  return hours >= 8 ? "completed" : "incomplete";
}