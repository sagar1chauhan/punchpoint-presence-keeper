import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { AppShell } from "@/components/layout/app-shell";
import { AuthCard } from "@/features/auth/auth-card";
import { ValidationView } from "@/features/validation/validation-view";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/validation")({
  component: ValidationPage,
});

function ValidationPage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <AppShell>
        <AuthCard />
      </AppShell>
    );
  }

  if (user.role !== "manager" && user.role !== "admin") {
    return (
      <AppShell>
        <div className="py-16 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">403 - Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Attendance Authenticity Validation requires Manager or Administrator privileges.
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
      <ValidationView />
    </AppShell>
  );
}
