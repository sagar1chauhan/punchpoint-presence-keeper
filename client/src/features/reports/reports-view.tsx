import { useState } from "react";
import { FileSpreadsheet, Printer, Calendar, Download, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";

import { useAppSelector } from "@/app/hooks";
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
import { useGetDailyReportQuery } from "@/services/api";

export function ReportsView() {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const { data: reportRows = [], isLoading } = useGetDailyReportQuery({ date: selectedDate });

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (reportRows.length === 0) {
      toast.error("No report data available to export.");
      return;
    }

    const headers = [
      "Staff Name",
      "Email",
      "Department",
      "Date",
      "Punch-In Time",
      "Punch-Out Time",
      "Hours Logged",
      "Shift Status",
      "Validation Status",
      "Overtime Status",
    ];

    const csvRows = [
      headers.join(","),
      ...reportRows.map((row) =>
        [
          `"${row.name}"`,
          `"${row.email}"`,
          `"${row.team}"`,
          `"${row.date}"`,
          `"${row.punchInTime ? new Date(row.punchInTime).toLocaleTimeString() : "N/A"}"`,
          `"${row.punchOutTime ? new Date(row.punchOutTime).toLocaleTimeString() : "N/A"}"`,
          row.hours,
          `"${row.shiftStatus}"`,
          `"${row.validationStatus}"`,
          `"${row.overtimeStatus}"`,
        ].join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PunchPoint_Daily_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded as Excel CSV.");
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const totalReportHours = reportRows.reduce((acc, r) => acc + (r.hours || 0), 0);
  const completedShifts = reportRows.filter((r) => r.shiftStatus === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            Daily Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role-scoped daily shifts overview (
            {user?.role === "employee"
              ? "Your records"
              : user?.role === "manager"
                ? "Your Team"
                : "Organization-wide"}
            ).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 h-9 text-xs rounded-xl"
          />
          <Button
            onClick={handleExportCSV}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-9 rounded-xl text-xs font-medium px-3"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Headcount in Report</span>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
            {reportRows.length}
          </p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Total Shift Hours Logged</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {totalReportHours.toFixed(1)}h
          </p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Full Completed Shifts (≥8h)</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {completedShifts}
          </p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Compliance Rate</span>
          <p className="text-2xl font-bold mt-1 text-violet-600 dark:text-violet-400">
            {reportRows.length > 0 ? Math.round((completedShifts / reportRows.length) * 100) : 0}%
          </p>
        </Card>
      </div>

      {/* Daily Report Data Table */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm print:shadow-none print:border-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Punch In</TableHead>
                <TableHead className="text-xs">Punch Out</TableHead>
                <TableHead className="text-xs">Hours Logged</TableHead>
                <TableHead className="text-xs">Shift Status</TableHead>
                <TableHead className="text-xs">Validation</TableHead>
                <TableHead className="text-xs">Overtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No attendance records for date {selectedDate}.
                  </TableCell>
                </TableRow>
              ) : (
                reportRows.map((row) => (
                  <TableRow key={row.userId} className="text-xs">
                    <TableCell>
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-[11px] text-slate-400">{row.email}</div>
                    </TableCell>
                    <TableCell>{row.team}</TableCell>
                    <TableCell>
                      {row.punchInTime
                        ? new Date(row.punchInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.punchOutTime
                        ? new Date(row.punchOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="font-bold">{row.hours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.shiftStatus === "completed"
                            ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                            : "border-amber-500 text-amber-600 bg-amber-500/10"
                        }
                      >
                        {row.shiftStatus === "completed" ? "Completed ≥8h" : "Incomplete <8h"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.validationStatus === "valid"
                            ? "border-emerald-500 text-emerald-600"
                            : row.validationStatus === "invalid"
                              ? "border-rose-500 text-rose-600"
                              : "border-slate-400 text-slate-500"
                        }
                      >
                        {row.validationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {row.overtimeStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
