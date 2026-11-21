import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Users,
  Clock,
  UserPlus,
  Search,
  Edit2,
  UserX,
  UserCheck as UserCheckIcon,
  ArrowRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { User } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useGetAllAttendanceQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} from "@/services/api";

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const { data: allAttendance = [], isLoading: isLoadingAttendance } = useGetAllAttendanceQuery();
  const { data: usersList = [], isLoading: isLoadingUsers } = useGetUsersQuery();

  const [createUserMut, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUserMut, { isLoading: isUpdatingUser }] = useUpdateUserMutation();

  // Search & Filter state
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("Password123!");
  const [newUserRole, setNewUserRole] = useState<"employee" | "manager" | "admin">("employee");
  const [newUserTeam, setNewUserTeam] = useState("Product Engineering");

  // Edit User State
  const [editUser, setEditUser] = useState<User | null>(null);

  // Metrics
  const totalEmployees = usersList.filter((u) => u.role === "employee").length;
  const totalManagers = usersList.filter((u) => u.role === "manager").length;
  const totalAdmins = usersList.filter((u) => u.role === "admin").length;
  const totalHoursLogged = allAttendance.reduce((acc, r) => acc + (r.hours || 0), 0);
  const completedShifts = allAttendance.filter((r) => r.shiftStatus === "completed").length;

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.team?.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserMut({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        team: newUserTeam,
      }).unwrap();
      toast.success(`User ${newUserName} created successfully.`);
      setUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || "Failed to create user");
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    try {
      await updateUserMut({
        id: targetUser.id,
        body: { isActive: !targetUser.isActive },
      }).unwrap();
      toast.success(`User status updated for ${targetUser.name}.`);
    } catch {
      toast.error("Failed to update user status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            System Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global attendance control, organization headcount, and user management.
          </p>
        </div>
        <Button
          onClick={() => setUserModalOpen(true)}
          className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Total Organization Users</span>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
            {usersList.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalEmployees} Employees &bull; {totalManagers} Managers &bull; {totalAdmins} Admins
          </span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Total Logged Shift Hours</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {totalHoursLogged.toFixed(0)}h
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            Across all teams
          </span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">
            Completed Standard Shifts (≥8h)
          </span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {completedShifts}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {allAttendance.length > 0
              ? Math.round((completedShifts / allAttendance.length) * 100)
              : 0}
            % compliance
          </span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Geofenced Punch Engine</span>
          <p className="text-2xl font-bold mt-1 text-violet-600 dark:text-violet-400">Active</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Haversine GPS boundary</span>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              User Accounts Directory
            </CardTitle>
            <CardDescription className="text-xs">
              Manage permissions, roles, and status of all organization staff
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search staff..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Staff Member</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Department / Team</TableHead>
                <TableHead className="text-xs">Reporting Manager</TableHead>
                <TableHead className="text-xs">Account Status</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="text-xs">
                  <TableCell>
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.role === "admin"
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                          : u.role === "manager"
                            ? "border-indigo-500/40 text-indigo-600 bg-indigo-500/10"
                            : "border-slate-400 text-slate-600 dark:text-slate-300"
                      }
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.team || "General"}</TableCell>
                  <TableCell>
                    {(u as { manager?: { name: string } }).manager?.name || "Direct Executive"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.isActive !== false
                          ? "border-emerald-500 text-emerald-600"
                          : "border-rose-500 text-rose-600"
                      }
                    >
                      {u.isActive !== false ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleToggleActive(u)}
                      className="h-7 text-[11px] rounded-lg px-2.5"
                    >
                      {u.isActive !== false ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add Staff Member</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a new user account with assigned role and department.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Initial Password</Label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="rounded-xl text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <select
                    value={newUserRole}
                    onChange={(e) =>
                      setNewUserRole(e.target.value as "employee" | "manager" | "admin")
                    }
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Input
                    value={newUserTeam}
                    onChange={(e) => setNewUserTeam(e.target.value)}
                    placeholder="Product Engineering"
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingUser}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
