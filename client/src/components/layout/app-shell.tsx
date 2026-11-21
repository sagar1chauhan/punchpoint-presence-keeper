import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Home,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { clearSession, setVerifiedUser } from "@/features/auth/authSlice";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PunchModal } from "@/features/punch/punch-modal";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetMeQuery,
} from "@/services/api";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync /auth/me on mount if token exists
  const { data: meData } = useGetMeQuery(undefined, { skip: status !== "authenticated" });
  useEffect(() => {
    if (meData && meData.id !== user?.id) {
      dispatch(setVerifiedUser(meData));
    }
  }, [meData, dispatch, user?.id]);

  // Notifications
  const { data: notifications = [], refetch: refetchNotifs } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 30000,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Socket.IO live notifications
  useEffect(() => {
    if (!user) return;

    let active = true;
    let socket: { disconnect: () => void; emit: (ev: string, ...args: unknown[]) => void; on: (ev: string, cb: (...args: unknown[]) => void) => void } | null = null;

    import("socket.io-client")
      .then(({ io }) => {
        if (!active) return;
        const socketUrl =
          (import.meta.env["VITE_SOCKET_URL"] as string | undefined) ?? "http://localhost:5000";

        socket = io(socketUrl, {
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
        });

        socket.on("connect", () => {
          socket?.emit("join", user.id);
          socket?.emit("join_role", user.role);
        });

        socket.on("notification", (rawNotif: unknown) => {
          const notif = rawNotif as { message: string; type?: string };
          toast.info(notif.message, {
            description: "PunchPoint Real-Time Alert",
            duration: 6000,
          });
          void refetchNotifs();
        });
      })
      .catch((err) => {
        console.warn("Socket.IO client load failed:", err);
      });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [user, refetchNotifs]);

  const handleLogout = () => {
    dispatch(clearSession());
    toast.success("You have been signed out");
  };

  const roleBadgeColor = {
    admin: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    manager: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    employee: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  }[user?.role ?? "employee"];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col antialiased text-slate-900 dark:text-slate-100 pb-20 md:pb-0 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  PunchPoint
                </span>
                <span className="text-[10px] -mt-1 font-medium text-slate-400 uppercase tracking-widest">
                  Presence Keeper
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  to="/"
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Dashboard
                </Link>
                {user.role !== "admin" && (
                  <Link
                    to="/attendance"
                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    My Attendance
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link
                    to="/users"
                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    Users
                  </Link>
                )}
                <Link
                  to="/overtime"
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  {user.role === "admin" ? "OT Approvals" : "Overtime"}
                </Link>
                {(user.role === "manager" || user.role === "admin") && (
                  <Link
                    to="/validation"
                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    Validation
                  </Link>
                )}
                <Link
                  to="/reports"
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Reports
                </Link>
              </nav>
            )}
          </div>

          {/* Right Header Controls */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Quick Punch Button - Only for non-admin employees/managers */}
              {user.role !== "admin" && (
                <Button
                  onClick={() => setPunchModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-md shadow-indigo-600/20 px-4 py-2 text-sm transition-all"
                >
                  <Camera className="h-4 w-4" />
                  <span>Punch Check-In</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 rounded-2xl p-2 shadow-xl border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} unread
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.read && void markRead(notif.id)}
                          className={`p-3 text-sm cursor-pointer rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            !notif.read
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20 font-medium"
                              : "text-slate-500"
                          }`}
                        >
                          <p className="text-xs leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="p-1 h-9 flex items-center gap-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Avatar className="h-7 w-7 border border-indigo-200 dark:border-indigo-900">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold text-xs">
                        {user.initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline-block text-xs font-semibold max-w-[100px] truncate">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl p-2 shadow-xl border-slate-200 dark:border-slate-800"
                >
                  <DropdownMenuLabel className="px-3 py-2 font-normal">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <Badge
                      variant="outline"
                      className={`mt-2 text-[10px] capitalize font-medium ${roleBadgeColor}`}
                    >
                      {user.role} &bull; {user.team}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600 rounded-xl px-3 py-2"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-xl"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      {/* Mobile Bottom Navigation Bar (320px responsive requirement) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg">
          <Link
            to="/"
            className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {user.role === "admin" ? (
            <>
              <Link
                to="/users"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <Users className="h-5 w-5" />
                <span>Users</span>
              </Link>
              <Link
                to="/validation"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <UserCheck className="h-5 w-5" />
                <span>Verify</span>
              </Link>
              <Link
                to="/overtime"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span>OT Queue</span>
              </Link>
              <Link
                to="/reports"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <FileText className="h-5 w-5" />
                <span>Reports</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/attendance"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <Clock className="h-5 w-5" />
                <span>History</span>
              </Link>

              {/* Central Mobile Punch FAB */}
              <button
                onClick={() => setPunchModalOpen(true)}
                className="-mt-5 h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 ring-4 ring-white dark:ring-slate-900 active:scale-95 transition-transform"
              >
                <Camera className="h-6 w-6" />
              </button>

              <Link
                to="/overtime"
                className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span>Overtime</span>
              </Link>

              {user.role === "manager" ? (
                <Link
                  to="/validation"
                  className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                >
                  <UserCheck className="h-5 w-5" />
                  <span>Verify</span>
                </Link>
              ) : (
                <Link
                  to="/reports"
                  className="flex flex-col items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                >
                  <FileText className="h-5 w-5" />
                  <span>Reports</span>
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* Camera Live Punch Modal */}
      {punchModalOpen && <PunchModal open={punchModalOpen} onOpenChange={setPunchModalOpen} />}
    </div>
  );
}
