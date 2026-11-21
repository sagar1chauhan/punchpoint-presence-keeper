import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { EmployeeDashboard } from "@/features/dashboard/employee-dashboard";
import { ManagerDashboard } from "@/features/dashboard/manager-dashboard";
import { AdminDashboard } from "@/features/dashboard/admin-dashboard";
import { PunchModal } from "@/features/punch/punch-modal";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user, status } = useAppSelector((state) => state.auth);
  const [punchModalOpen, setPunchModalOpen] = useState(false);

  if (status === "anonymous" || !user) {
    return (
      <AppShell>
        <AuthCard />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {user.role === "admin" && <AdminDashboard user={user} />}
      {user.role === "manager" && <ManagerDashboard user={user} />}
      {user.role === "employee" && (
        <EmployeeDashboard user={user} onOpenPunch={() => setPunchModalOpen(true)} />
      )}
      {punchModalOpen && <PunchModal open={punchModalOpen} onOpenChange={setPunchModalOpen} />}
    </AppShell>
  );
}
