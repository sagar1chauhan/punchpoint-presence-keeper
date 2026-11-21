import { createFileRoute } from "@tanstack/react-router";
import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { ReportsView } from "@/features/reports/reports-view";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
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
      <ReportsView />
    </AppShell>
  );
}
