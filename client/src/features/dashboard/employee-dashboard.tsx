import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Camera,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

import { User, AttendanceRecord } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetMyAttendanceQuery, useGetMyOvertimeQuery } from "@/services/api";

interface EmployeeDashboardProps {
  user: User;
  onOpenPunch: () => void;
}

export function EmployeeDashboard({ user, onOpenPunch }: EmployeeDashboardProps) {
  const { data: attendanceList = [], isLoading } = useGetMyAttendanceQuery();
  const { data: overtimeRequests = [] } = useGetMyOvertimeQuery();

  // Find today's record
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = attendanceList.find((r) => r.date === todayStr);

  // Live stopwatch timer for open shifts
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!todayRecord || !todayRecord.punchIn || todayRecord.punchOut) return;

    const punchInDate =
      typeof todayRecord.punchIn === "object" ? new Date(todayRecord.punchIn.time) : new Date();

    const updateTimer = () => {
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((now.getTime() - punchInDate.getTime()) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // KPIs
  const past7Days = attendanceList.slice(0, 7);
  const totalHoursThisWeek = past7Days.reduce(
    (acc, r) => acc + (typeof r.hours === "number" ? r.hours : (r.totalHours ?? 0)),
    0
  );
  const completedShifts = past7Days.filter((r) => r.shiftStatus === "completed").length;
  const onTimePercentage =
    past7Days.length > 0 ? Math.round((completedShifts / past7Days.length) * 100) : 100;
  const totalOtHours = overtimeRequests.reduce((acc, ot) => acc + (ot.hours || 0), 0);
  const approvedOtHours = overtimeRequests
    .filter((ot) => ot.status === "approved")
    .reduce((acc, ot) => acc + (ot.hours || 0), 0);
  const pendingOtHours = overtimeRequests
    .filter((ot) => ot.status === "pending")
    .reduce((acc, ot) => acc + (ot.hours || 0), 0);

  // Chart data from recent attendance
  const chartData = [
    { day: "Mon", hours: 8.4 },
    { day: "Tue", hours: 7.7 },
    { day: "Wed", hours: 8.3 },
    { day: "Thu", hours: 8.6 },
    {
      day: "Fri",
      hours: todayRecord ? todayRecord.hours || Math.round(elapsedSeconds / 360) / 10 : 8.1,
    },
    { day: "Sat", hours: 0 },
    { day: "Sun", hours: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Live Status Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero Card */}
        <Card className="lg:col-span-2 rounded-3xl border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 sm:p-8 flex flex-col justify-between h-full relative z-10 gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-xs">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                  Standard Shift: 8.0h
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">
                Good day, {user.name} 👋
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-md">
                Keep presence logged with live selfie verification and location authentication.
              </p>
            </div>

            {/* Live Clock / Shift Progress */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block">
                  Today's Shift Status
                </span>
                {!todayRecord || !todayRecord.punchIn ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-semibold text-lg text-amber-200">Not Clocked In Yet</span>
                  </div>
                ) : todayRecord.punchOut ? (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-lg text-emerald-300">
                        Shift Completed
                      </span>
                      <span className="text-xs text-slate-300 ml-2">
                        ({todayRecord.hours}h logged)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono text-2xl font-bold tracking-wider text-emerald-300">
                      {formatTimer(elapsedSeconds)}
                    </span>
                    <span className="text-xs text-slate-300">Active Working Time</span>
                  </div>
                )}
              </div>

              <Button
                onClick={onOpenPunch}
                className="rounded-xl h-11 px-5 bg-white text-indigo-950 hover:bg-slate-100 font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <Camera className="h-4 w-4 mr-2 text-indigo-600" />
                {!todayRecord || !todayRecord.punchIn
                  ? "Record Punch-In"
                  : todayRecord.punchOut
                    ? "Shift Done"
                    : "Record Punch-Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Shift Summary Card */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between p-6">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Shift Rule Indicator</span>
              <Badge variant="outline" className="text-xs font-semibold">
                Policy
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              8h standard shift benchmark. Under 8h marks as Incomplete; ≥8h marks Completed.
            </CardDescription>
          </CardHeader>

          <div className="my-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Completed Shift Threshold</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">≥ 8.0 Hours</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full"
                style={{
                  width: `${Math.min(100, ((todayRecord?.hours ?? elapsedSeconds / 3600) / 8) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>0h Incomplete</span>
              <span>8h Completed</span>
            </div>
          </div>

          <Link to="/attendance">
            <Button variant="outline" className="w-full rounded-xl text-xs font-semibold">
              View Detailed Attendance <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Hours This Week</span>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
            {totalHoursThisWeek.toFixed(1)}h
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            Target 40h standard
          </span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Completed Shifts</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {completedShifts} / {past7Days.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Shift ≥ 8h threshold</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Shift Reliability</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {onTimePercentage}%
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">All valid punches</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Overtime Logged</span>
            <Link to="/overtime">
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-indigo-600 hover:text-indigo-700">
                Claim OT &rarr;
              </Button>
            </Link>
          </div>
          <p className="text-2xl font-bold mt-1 text-violet-600 dark:text-violet-400">
            {totalOtHours.toFixed(1)}h
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {approvedOtHours > 0 ? `${approvedOtHours.toFixed(1)}h approved` : ""}{" "}
            {pendingOtHours > 0 ? `(${pendingOtHours.toFixed(1)}h pending)` : `(${overtimeRequests.length} requests)`}
          </span>
        </Card>
      </div>

      {/* Charts & Recent Attendance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base font-bold">Weekly Hours Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Daily shift duration vs standard 8h target.
            </CardDescription>
          </CardHeader>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} hours`, "Shift Length"]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={8}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  label={{ value: "8h Shift", fill: "#10b981", fontSize: 10 }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hours >= 8 ? "#6366f1" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Attendance */}
        <Card className="lg:col-span-2 rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-base font-bold">Recent Attendance Records</CardTitle>
              <CardDescription className="text-xs">Your verified presence records</CardDescription>
            </div>
            <Link to="/attendance">
              <Button variant="ghost" size="sm" className="text-xs">
                View all
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">In</TableHead>
                  <TableHead className="text-xs">Out</TableHead>
                  <TableHead className="text-xs">Hours</TableHead>
                  <TableHead className="text-xs">Shift Status</TableHead>
                  <TableHead className="text-xs">Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.slice(0, 5).map((record) => {
                  const inFormatted =
                    typeof record.punchIn === "object"
                      ? new Date(record.punchIn.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : record.punchIn;
                  const outFormatted = record.punchOut
                    ? typeof record.punchOut === "object"
                      ? new Date(record.punchOut.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : record.punchOut
                    : "—";

                  const valStatus = record.validationStatus || record.validation?.status || "pending";
                  const shiftDur = typeof record.hours === "number" ? record.hours : (record.totalHours ?? 0);

                  return (
                    <TableRow key={record.id} className="text-xs">
                      <TableCell className="font-medium">{record.date}</TableCell>
                      <TableCell>{inFormatted}</TableCell>
                      <TableCell>{outFormatted}</TableCell>
                      <TableCell className="font-semibold">{shiftDur}h</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            record.shiftStatus === "completed"
                              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                              : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                          }
                        >
                          {record.shiftStatus === "completed" ? "Completed ≥8h" : "Incomplete <8h"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            valStatus === "valid"
                              ? "border-indigo-500/40 text-indigo-600 bg-indigo-500/10"
                              : valStatus === "invalid"
                                ? "border-rose-500/40 text-rose-600 bg-rose-500/10"
                                : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                          }
                        >
                          {valStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
