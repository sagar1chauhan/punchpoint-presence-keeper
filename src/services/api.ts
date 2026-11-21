import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { demoAttendance, demoOvertime, demoUsers, getDemoUser } from "@/lib/mock-data";
import type { ApiResponse, AttendanceRecord, AuthPayload, OvertimeRequest, User, UserRole } from "@/types/attendance";
import type { AuthState } from "@/features/auth/authSlice";
import { clearSession } from "@/features/auth/authSlice";

type LoginInput = { email: string; password: string; role: UserRole };
type SignupInput = { name: string; email: string; password: string; role: UserRole };
type PunchInput = { lat: number; lng: number; selfie: string; timestamp: string };

const realBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? "",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const mockableBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  if (import.meta.env.VITE_USE_MOCK !== "false") {
    const request = typeof args === "string" ? { url: args, method: "GET" } : args;
    const body = (request.body ?? {}) as Record<string, unknown>;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 220));
    let data: unknown = null;
    let message = "Mock request completed.";

    if (request.url.startsWith("/auth/login") || request.url.startsWith("/auth/signup")) {
      const role = (body.role as UserRole | undefined) ?? "employee";
      const user = getDemoUser(role, body.name as string | undefined, body.email as string | undefined);
      data = { token: `demo-${role}-token`, user } satisfies AuthPayload;
      message = `Welcome, ${user.name}.`;
    } else if (request.url === "/auth/me") {
      const token = (api.getState() as { auth: AuthState }).auth.token;
      const role = (['employee', 'manager', 'admin'] as const).find((candidate) => token === `demo-${candidate}-token`);
      const user = role ? demoUsers.find((candidate) => candidate.role === role) : undefined;
      if (!user) return { error: { status: 401, data: { message: "Session expired." } } };
      data = user;
    } else if (request.url.startsWith("/attendance/me")) {
      data = demoAttendance;
    } else if (request.url === "/attendance/punch-in" || request.url === "/attendance/punch-out") {
      data = { recorded: true, timestamp: body.timestamp };
      message = request.url.endsWith("punch-in") ? "You are punched in." : "Your shift is complete.";
    } else if (request.url === "/overtime/me") {
      data = demoOvertime;
    }

    return { data: { success: true, data, message } satisfies ApiResponse<unknown> };
  }

  const result = await realBaseQuery(args, api, extraOptions);
  if ("error" in result && result.error.status === 401) api.dispatch(clearSession());
  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: mockableBaseQuery,
  tagTypes: ["Auth", "Attendance", "Overtime"],
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
    getMyAttendance: builder.query<AttendanceRecord[], { from?: string; to?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: "/attendance/me", params }),
      transformResponse: (response: ApiResponse<AttendanceRecord[]>) => response.data,
      providesTags: ["Attendance"],
    }),
    punchIn: builder.mutation<{ recorded: boolean; timestamp: string }, PunchInput>({
      query: (body) => ({ url: "/attendance/punch-in", method: "POST", body }),
      transformResponse: (response: ApiResponse<{ recorded: boolean; timestamp: string }>) => response.data,
      invalidatesTags: ["Attendance"],
    }),
    punchOut: builder.mutation<{ recorded: boolean; timestamp: string }, PunchInput>({
      query: (body) => ({ url: "/attendance/punch-out", method: "POST", body }),
      transformResponse: (response: ApiResponse<{ recorded: boolean; timestamp: string }>) => response.data,
      invalidatesTags: ["Attendance"],
    }),
    getMyOvertime: builder.query<OvertimeRequest[], void>({
      query: () => "/overtime/me",
      transformResponse: (response: ApiResponse<OvertimeRequest[]>) => response.data,
      providesTags: ["Overtime"],
    }),
  }),
});

export const { useLoginMutation, useSignupMutation, useGetMeQuery, useGetMyAttendanceQuery, usePunchInMutation, usePunchOutMutation, useGetMyOvertimeQuery } = api;