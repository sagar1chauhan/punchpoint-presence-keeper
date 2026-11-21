import { createFileRoute } from "@tanstack/react-router";
import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { AttendanceView } from "@/features/attendance/attendance-view";

export const Route = createFileRoute("/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <AppShell>
        <AuthCard />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AttendanceView />
    </AppShell>
  );
}
