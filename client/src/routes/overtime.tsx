import { createFileRoute } from "@tanstack/react-router";
import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { OvertimeView } from "@/features/overtime/overtime-view";

export const Route = createFileRoute("/overtime")({
  component: OvertimePage,
});

function OvertimePage() {
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
      <OvertimeView />
    </AppShell>
  );
}
