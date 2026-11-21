import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { AdminDashboard } from "@/features/dashboard/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <AppShell>
        <AuthCard />
      </AppShell>
    );
  }

  if (user.role !== "admin") {
    return (
      <AppShell>
        <div className="py-16 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">403 - Admin Access Required</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            User administration and staff directory management requires Administrator credentials.
          </p>
          <Link to="/" className="mt-6">
            <Button className="rounded-xl text-xs">Return to Dashboard</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AdminDashboard user={user} />
    </AppShell>
  );
}
