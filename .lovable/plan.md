# PunchPoint — first build

## What to build
- Establish PunchPoint's requested visual system: indigo/violet with emerald accents, Inter, persistent system-aware light/dark themes, clear focus states, and reduced-motion support.
- Build the responsive app shell and public login/signup screens, with demo role selection and mock sign-in.
- Build the employee dashboard with populated attendance/overtime summaries, weekly-hours chart, recent records, and live working timer.
- Build the camera-only punch flow: location permission and accuracy, configurable geofence state, live camera capture/review, and mock punch confirmation.
- Add typed mock models and an API layer with the `VITE_API_URL` / `VITE_USE_MOCK` switch, plus `.env.example` and concise setup notes.
- Add route metadata and verify the main page and punch flow.

## Technical details
- Keep the existing TanStack Start routing; this platform's project structure does not support the requested React Router v6.
- Use Redux Toolkit and RTK Query for the requested client state and API pattern, while keeping the existing TanStack Start runtime and file-based routes.
- Limit this pass to auth, app shell, and employee dashboard/punch flow; manager, admin, reports, attendance history, and overtime management remain later phases.
