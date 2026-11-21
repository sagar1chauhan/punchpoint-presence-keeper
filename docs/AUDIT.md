# PunchPoint - System Audit & Implementation Plan

**Date:** 2026-11-21  
**Project:** PunchPoint Attendance Management System (MERN)  
**Author:** Antigravity (Senior Full-Stack Engineer)  

---

## 1. Executive Summary

PunchPoint is a full-stack Attendance Management System built on the MERN stack (MongoDB, Express, React, Node.js) featuring location-verified check-ins, live camera selfie verification (no file uploads), role-based access control (Employee, Manager, Admin), working hours calculation (8h standard shift threshold), overtime request/approval workflows, attendance authenticity validation with photo inspection, and daily reporting (with PDF/Excel export).

The frontend was started in Lovable using TanStack Start (file-based routing), Tailwind CSS v4, Lucide icons, Framer Motion, and Redux Toolkit with RTK Query. Lovable ran out of credits, leaving scaffolding with several build-breaking TypeScript errors and an empty UI shell.

---

## 2. Codebase Audit

### 2.1 Existing & Functional Assets
- **UI Components:** Rich library of shadcn/ui components (`client/src/components/ui/`) using Radix UI primitives (Dialog, Drawer, Table, Tabs, Card, Button, Avatar, Badge, etc.).
- **Styling & Theme:** Configured Tailwind CSS with Inter font, rounded-2xl cards, indigo/violet primary, emerald accents, and a functional `ThemeProvider` supporting dark/light mode toggles.
- **Routing Infrastructure:** TanStack Start and TanStack Router (`__root.tsx`, `router.tsx`, `routeTree.gen.ts`) with custom root layout, Toaster, and QueryClient context.
- **Mock Data & Domain Models:** Initial domain types in `src/types/attendance.ts` and baseline mock dataset in `src/lib/mock-data.ts`.

### 2.2 Broken Code & Root Causes
1. **`client/src/app/store.ts`:**
   - *Issue:* `authPersistenceMiddleware` uses loose `action as { type?: string }` and improperly typed `getState()` calls; Redux Toolkit middleware chain inference issues.
   - *Fix:* Strictly type `authPersistenceMiddleware` with `Middleware<{}, RootState>` and proper action matcher checks (`setSession.match`, etc.).
2. **`client/src/features/auth/authSlice.ts`:**
   - *Issue:* Mix of Immer state mutations and object returns inside `createSlice` reducers; unused `demoUsers` import; state status transitions.
   - *Fix:* Clean up reducer definitions to standard Immer mutation patterns, export action creators cleanly, and type payloads strictly.
3. **`client/src/services/api.ts`:**
   - *Issue:* `mockableBaseQuery` type mismatch with `BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>`; handling of 401 unwrap; missing endpoints for manager/admin operations (team attendance, validation, user management, reports).
   - *Fix:* Align base query return contract `{ data: ... } | { error: ... }`, define full endpoint suite (login, signup, getMe, punchIn, punchOut, getMyAttendance, getTeamAttendance, getAllAttendance, validateAttendance, getMyOvertime, getPendingOvertime, reviewOvertime, getUsers, createUser, updateUser, getDailyReport, getNotifications, markNotificationRead).
4. **`client/src/app/session-bootstrap.tsx`:**
   - *Issue:* Direct dispatch of `api.endpoints.getMe.initiate` unwrap typing issues and handling of SSR execution environments.
   - *Fix:* Add defensive browser check, type unwrap promise cleanly, restore verified user on success or dispatch `clearSession()` on failure.
5. **`client/src/test/app-routing.test.tsx`:**
   - *Issue:* Router creation lacks the required `store` context required by `Route = createRootRouteWithContext<{ queryClient: QueryClient; store: AppStore }>()`.
   - *Fix:* Provide `store: makeStore()` in test router context.

### 2.3 Missing Features (Against Assessment Brief)
| Feature | Brief Requirement | Status |
|---|---|---|
| **Auth & RBAC** | Login/signup, JWT, Employee/Manager/Admin roles, session bootstrap | Broken/Scaffold only |
| **Punch In/Out** | Live camera selfie (no file upload), Geo coordinates, timestamp | Not built |
| **Shift Status** | Total hours computation, Completed (>= 8h) vs Incomplete (< 8h) | Type exists, logic missing |
| **Overtime Flow** | Employee request, Manager/Admin approve/reject, status sync on attendance | Scaffold only |
| **Dashboards** | Employee (timer, stats, chart), Manager (team view, queues), Admin (user management, system stats) | Not built (placeholder) |
| **Validation** | Admin/Manager photo review with zoom, location inspection, Valid/Invalid with remarks | Not built |
| **Daily Reports** | Name, punches, selfie, location, hours, status with role scoping, export PDF & Excel | Not built |
| **Backend API** | Express, MongoDB, Mongoose, Zod, Winston/Morgan, JWT, Cloudinary / local uploads | Missing entirely |
| **Bonus Features** | Geofencing validation, real-time Socket.IO alerts, notifications drawer | Missing |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Fix Frontend Build & Tests
1. Resolve TypeScript and lint errors in `client/src/app/store.ts`, `client/src/features/auth/authSlice.ts`, `client/src/services/api.ts`, `client/src/app/session-bootstrap.tsx`.
2. Fix `client/src/test/app-routing.test.tsx` router test context.
3. Validate `npm run build`, `npm run lint`, and `npm test` pass with 0 errors.

### Step 2: Build Complete Backend (`/server`)
1. Initialize `/server` with Node.js, Express, Mongoose, JWT, bcryptjs, Zod, Winston, Morgan, Helmet, CORS, express-rate-limit, Socket.IO, Multer (for base64/buffer image intake), and Cloudinary.
2. Build Mongoose schemas & indexes:
   - `User`: name, email, passwordHash, role, managerId, isActive.
   - `Attendance`: userId, date (YYYY-MM-DD), punchIn, punchOut, totalHours, shiftStatus, validation, overtimeStatus.
   - `OvertimeRequest`: attendanceId, userId, hours, reason, status, reviewedBy, reviewNote.
   - `Notification`: userId, type, message, read, createdAt.
3. Implement RBAC middleware (`authenticate`, `authorize`), Haversine geofencing utility, and central error handler.
4. Implement controllers and routes matching RTK Query contracts.
5. Create comprehensive seed script (`npm run seed`) with 1 admin, 2 managers, 6 employees, and 30 days of realistic history.
6. Create `api.http` with sample requests for every endpoint.

### Step 3: Finish Frontend Implementation (`/client`)
1. Navigation & App Shell: Top navbar with user badge, role indicator, notification bell, theme toggle, responsive mobile bottom navigation.
2. Auth screens: Login & Signup with demo mode quick credentials.
3. Employee Dashboard: Live shift timer, punch status, 4 KPI cards, Recharts weekly hours graph, recent attendance table.
4. Live Camera Punch Modal: HTML5 `video` + `canvas` capture (`navigator.mediaDevices.getUserMedia`), geolocation capture, review/retake step, zero file upload input.
5. My Attendance & Detail Drawer: Date range filtering, status filter, pagination, selfie lightbox, overtime request trigger.
6. Overtime Management: Employee submit request dialog, manager/admin pending review queue with approval/rejection modal.
7. Validation Screen: Photo comparison zoom lightbox, GPS coordinates, mark Valid or mark Invalid with required remarks.
8. Admin User Management: Searchable/filterable user table, create/edit user dialog, activate/deactivate toggle.
9. Reports View: Daily report table, date filter, role-scoped, export to Excel (CSV/XLSX) and PDF (printable format).
10. Live Notifications: Socket.IO client integration for real-time alerts.

### Step 4: Quality & Unit Testing
1. Add backend unit/integration tests for:
   - Working hours calculation (8h threshold).
   - RBAC scoping (Employee vs Manager vs Admin data access).
   - Overtime status synchronization.
   - Haversine geofence calculation.
2. Provide `.env.example` in both `/client` and `/server`.

### Step 5: Verification & End-to-End Checklist
1. Verify all 11 evaluation checklist items in the live environment.
2. Document test results with proof.

### Step 6: Deployment & Documentation
1. Add `vercel.json` for frontend and Render configuration for backend.
2. Write comprehensive `README.md` with architecture diagram, API documentation, assumptions, and interview talking points.
