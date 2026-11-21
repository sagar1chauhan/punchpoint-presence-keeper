import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { demoAttendance, demoOvertime, demoUsers, getDemoUser } from "@/lib/mock-data";
import type {
  ApiResponse,
  AttendanceRecord,
  AuthPayload,
  DailyReportItem,
  NotificationItem,
  OvertimeRequest,
  User,
  UserRole,
} from "@/types/attendance";
import type { AuthState } from "@/features/auth/authSlice";
import { clearSession } from "@/features/auth/authSlice";

export type LoginInput = { email: string; password: string; role?: UserRole };
export type SignupInput = { name: string; email: string; password: string; role?: UserRole };
export type PunchInput = { lat: number; lng: number; selfieUrl: string; time?: string };
export type ValidateInput = { status: "valid" | "invalid"; remarks?: string };
export type CreateOvertimeInput = {
  attendanceId: string;
  hours: number;
  reason: string;
  date?: string;
};
export type ReviewOvertimeInput = { status: "approved" | "rejected"; reviewNote?: string };
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  team?: string;
  managerId?: string | null;
};
export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: UserRole;
  team?: string;
  managerId?: string | null;
  isActive?: boolean;
};

const realBaseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:5000/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const mockableBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  baseQueryApi,
  extraOptions,
) => {
  const useMock = (import.meta.env["VITE_USE_MOCK"] as string | undefined) === "true";

  if (useMock) {
    const request = typeof args === "string" ? { url: args, method: "GET" } : args;
    const body = (request.body ?? {}) as Record<string, unknown>;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 180));
    let data: unknown = null;
    let message = "Mock request completed.";

    if (request.url.startsWith("/auth/login") || request.url.startsWith("/auth/signup")) {
      const role = (body["role"] as UserRole | undefined) ?? "employee";
      const user = getDemoUser(
        role,
        body["name"] as string | undefined,
        body["email"] as string | undefined,
      );
      data = { token: `demo-${role}-token`, user } satisfies AuthPayload;
      message = `Welcome, ${user.name}.`;
    } else if (request.url === "/auth/me") {
      const token = (baseQueryApi.getState() as { auth: AuthState }).auth.token;
      const role = (["employee", "manager", "admin"] as const).find(
        (candidate) => token === `demo-${candidate}-token`,
      );
      const user = role ? demoUsers.find((candidate) => candidate.role === role) : undefined;
      if (!user) return { error: { status: 401, data: { message: "Session expired." } } };
      data = user;
    } else if (
      request.url.startsWith("/attendance/me") ||
      request.url.startsWith("/attendance/team") ||
      request.url.startsWith("/attendance/all")
    ) {
      data = demoAttendance;
    } else if (request.url === "/attendance/punch-in" || request.url === "/attendance/punch-out") {
      data = {
        recorded: true,
        timestamp: (body["time"] as string | undefined) ?? new Date().toISOString(),
      };
      message = request.url.endsWith("punch-in")
        ? "You are punched in."
        : "Your shift is complete.";
    } else if (
      request.url.startsWith("/overtime/me") ||
      request.url.startsWith("/overtime/pending")
    ) {
      data = demoOvertime;
    } else if (request.url.startsWith("/users")) {
      data = demoUsers;
    } else if (request.url.startsWith("/notifications")) {
      data = [];
    } else if (request.url.startsWith("/reports/daily")) {
      data = [];
    }

    return { data: { success: true, data, message } satisfies ApiResponse<unknown> };
  }

  const result = await realBaseQuery(args, baseQueryApi, extraOptions);
  if ("error" in result && result.error && result.error.status === 401) {
    baseQueryApi.dispatch(clearSession());
  }
  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: mockableBaseQuery,
  tagTypes: ["Auth", "Attendance", "Overtime", "Users", "Notifications", "Reports"],
  endpoints: (builder) => ({
    login: builder.mutation<AuthPayload, LoginInput>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (response: ApiResponse<AuthPayload>) => response.data,
      invalidatesTags: ["Auth"],
    }),
    signup: builder.mutation<AuthPayload, SignupInput>({
      query: (body) => ({ url: "/auth/signup", method: "POST", body }),
      transformResponse: (response: ApiResponse<AuthPayload>) => response.data,
      invalidatesTags: ["Auth"],
    }),
    getMe: builder.query<User | null, void>({
      query: () => "/auth/me",
      transformResponse: (response: ApiResponse<User | null>) => response.data,
      providesTags: ["Auth"],
    }),

    // Attendance
    getMyAttendance: builder.query<
      AttendanceRecord[],
      {
        from?: string | undefined;
        to?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
      } | void
    >({
      query: (params) => ({ url: "/attendance/me", params: params || {} }),
      transformResponse: (response: ApiResponse<AttendanceRecord[]>) => response.data,
      providesTags: ["Attendance"],
    }),
    getTeamAttendance: builder.query<
      AttendanceRecord[],
      {
        date?: string | undefined;
        status?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
      } | void
    >({
      query: (params) => ({ url: "/attendance/team", params: params || {} }),
      transformResponse: (response: ApiResponse<AttendanceRecord[]>) => response.data,
      providesTags: ["Attendance"],
    }),
    getAllAttendance: builder.query<
      AttendanceRecord[],
      {
        date?: string | undefined;
        userId?: string | undefined;
        status?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
      } | void
    >({
      query: (params) => ({ url: "/attendance/all", params: params || {} }),
      transformResponse: (response: ApiResponse<AttendanceRecord[]>) => response.data,
      providesTags: ["Attendance"],
    }),
    punchIn: builder.mutation<{ recorded: boolean; attendance: AttendanceRecord }, PunchInput>({
      query: (body) => ({ url: "/attendance/punch-in", method: "POST", body }),
      transformResponse: (
        response: ApiResponse<{ recorded: boolean; attendance: AttendanceRecord }>,
      ) => response.data,
      invalidatesTags: ["Attendance"],
    }),
    punchOut: builder.mutation<{ recorded: boolean; attendance: AttendanceRecord }, PunchInput>({
      query: (body) => ({ url: "/attendance/punch-out", method: "POST", body }),
      transformResponse: (
        response: ApiResponse<{ recorded: boolean; attendance: AttendanceRecord }>,
      ) => response.data,
      invalidatesTags: ["Attendance"],
    }),
    validateAttendance: builder.mutation<AttendanceRecord, { id: string; body: ValidateInput }>({
      query: ({ id, body }) => ({ url: `/attendance/${id}/validate`, method: "PATCH", body }),
      transformResponse: (response: ApiResponse<AttendanceRecord>) => response.data,
      invalidatesTags: ["Attendance", "Reports"],
    }),

    // Overtime
    requestOvertime: builder.mutation<OvertimeRequest, CreateOvertimeInput>({
      query: (body) => ({ url: "/overtime", method: "POST", body }),
      transformResponse: (response: ApiResponse<OvertimeRequest>) => response.data,
      invalidatesTags: ["Overtime", "Attendance"],
    }),
    getMyOvertime: builder.query<OvertimeRequest[], void>({
      query: () => "/overtime/me",
      transformResponse: (response: ApiResponse<OvertimeRequest[]>) => response.data,
      providesTags: ["Overtime"],
    }),
    getPendingOvertime: builder.query<OvertimeRequest[], void>({
      query: () => "/overtime/pending",
      transformResponse: (response: ApiResponse<OvertimeRequest[]>) => response.data,
      providesTags: ["Overtime"],
    }),
    reviewOvertime: builder.mutation<OvertimeRequest, { id: string; body: ReviewOvertimeInput }>({
      query: ({ id, body }) => ({ url: `/overtime/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiResponse<OvertimeRequest>) => response.data,
      invalidatesTags: ["Overtime", "Attendance"],
    }),

    // Users
    getUsers: builder.query<
      User[],
      { search?: string; role?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: "/users", params: params || {} }),
      transformResponse: (response: ApiResponse<User[]>) => response.data,
      providesTags: ["Users"],
    }),
    createUser: builder.mutation<User, CreateUserInput>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      transformResponse: (response: ApiResponse<User>) => response.data,
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<User, { id: string; body: UpdateUserInput }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiResponse<User>) => response.data,
      invalidatesTags: ["Users"],
    }),

    // Reports
    getDailyReport: builder.query<DailyReportItem[], { date?: string; userId?: string } | void>({
      query: (params) => ({ url: "/reports/daily", params: params || {} }),
      transformResponse: (response: ApiResponse<DailyReportItem[]>) => response.data,
      providesTags: ["Reports"],
    }),

    // Notifications
    getNotifications: builder.query<NotificationItem[], void>({
      query: () => "/notifications",
      transformResponse: (response: ApiResponse<NotificationItem[]>) => response.data,
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      transformResponse: (response: ApiResponse<{ success: boolean }>) => response.data,
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useGetMeQuery,
  useGetMyAttendanceQuery,
  useGetTeamAttendanceQuery,
  useGetAllAttendanceQuery,
  usePunchInMutation,
  usePunchOutMutation,
  useValidateAttendanceMutation,
  useRequestOvertimeMutation,
  useGetMyOvertimeQuery,
  useGetPendingOvertimeQuery,
  useReviewOvertimeMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetDailyReportQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = api;
