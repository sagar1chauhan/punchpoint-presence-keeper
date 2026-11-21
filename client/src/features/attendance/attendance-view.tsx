import { useState } from "react";
import { Clock, Filter, Eye, Plus, ArrowLeft, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";

import { AttendanceRecord, ShiftStatus, ValidationStatus } from "@/types/attendance";
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useGetMyAttendanceQuery, useRequestOvertimeMutation } from "@/services/api";

export function AttendanceView() {
  const [page, setPage] = useState(1);
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: records = [], isLoading } = useGetMyAttendanceQuery({
    from: fromFilter || undefined,
    to: toFilter || undefined,
    page,
    limit: 20,
  });

  const [requestOt, { isLoading: isRequestingOt }] = useRequestOvertimeMutation();

  // Detail Drawer State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Request Overtime Dialog State
  const [otModalOpen, setOtModalOpen] = useState(false);
  const [otAttendanceId, setOtAttendanceId] = useState<string>("");
  const [otHours, setOtHours] = useState<number>(1.0);
  const [otReason, setOtReason] = useState<string>("");

  const handleOpenOtModal = (rec: AttendanceRecord) => {
    setOtAttendanceId(rec.id);
    const calculatedExtra = rec.hours > 8 ? Math.round((rec.hours - 8) * 10) / 10 : 1.0;
    setOtHours(calculatedExtra > 0 ? calculatedExtra : 1.0);
    setOtReason("");
    setOtModalOpen(true);
  };

  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otReason.trim()) {
      toast.error("Please enter a reason for overtime.");
      return;
    }

    try {
      await requestOt({
        attendanceId: otAttendanceId,
        hours: otHours,
        reason: otReason,
      }).unwrap();
      toast.success("Overtime request submitted for manager review.");
      setOtModalOpen(false);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || "Failed to submit overtime request");
    }
  };

  const filtered = records.filter((r) => {
    if (statusFilter === "completed") return r.shiftStatus === "completed";
    if (statusFilter === "incomplete") return r.shiftStatus === "incomplete";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Attendance History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete log of verified punch-ins, selfies, working hours, and validation statuses.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            placeholder="From"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="w-36 h-9 text-xs rounded-xl"
          />
          <Input
            type="date"
            placeholder="To"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="w-36 h-9 text-xs rounded-xl"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <option value="all">All Shifts</option>
            <option value="completed">Completed (≥8h)</option>
            <option value="incomplete">Incomplete (&lt;8h)</option>
          </select>
          {(fromFilter || toFilter || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromFilter("");
                setToFilter("");
                setStatusFilter("all");
              }}
              className="text-xs h-9 px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Punch In</TableHead>
                <TableHead className="text-xs">Punch Out</TableHead>
                <TableHead className="text-xs">Working Hours</TableHead>
                <TableHead className="text-xs">Shift Policy</TableHead>
                <TableHead className="text-xs">Validation</TableHead>
                <TableHead className="text-xs">Overtime</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No attendance records found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((record) => {
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

                  return (
                    <TableRow
                      key={record.id}
                      className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <TableCell className="font-semibold">{record.date}</TableCell>
                      <TableCell>{inFormatted}</TableCell>
                      <TableCell>{outFormatted}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        {record.hours}h
                      </TableCell>
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
                            record.validationStatus === "valid"
                              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                              : record.validationStatus === "invalid"
                                ? "border-rose-500/40 text-rose-600 bg-rose-500/10"
                                : "border-slate-400 text-slate-500"
                          }
                        >
                          {record.validationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            record.overtimeStatus === "approved"
                              ? "border-emerald-500 text-emerald-600"
                              : record.overtimeStatus === "pending"
                                ? "border-amber-500 text-amber-600"
                                : record.overtimeStatus === "rejected"
                                  ? "border-rose-500 text-rose-600"
                                  : "border-slate-300 text-slate-400"
                          }
                        >
                          {record.overtimeStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRecord(record)}
                          className="h-7 text-xs rounded-lg px-2 text-indigo-600 dark:text-indigo-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {record.overtimeStatus === "none" && record.hours > 8 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenOtModal(record)}
                            className="h-7 text-[11px] rounded-lg px-2 border-indigo-200 text-indigo-600"
                          >
                            + Claim OT
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Record Detail Drawer */}
      <Drawer
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      >
        <DrawerContent className="max-w-xl mx-auto rounded-t-3xl p-6">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle className="text-lg font-bold flex items-center justify-between">
              <span>Shift Details: {selectedRecord?.date}</span>
              <Badge
                variant="outline"
                className={
                  selectedRecord?.shiftStatus === "completed"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-amber-500 text-amber-600"
                }
              >
                {selectedRecord?.shiftStatus === "completed" ? "Completed ≥8h" : "Incomplete <8h"}
              </Badge>
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Verified coordinates and camera photo taken during check-in.
            </DrawerDescription>
          </DrawerHeader>

          {selectedRecord && (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Punch In Photo */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    Punch-In Verification Photo
                  </span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {typeof selectedRecord.punchIn === "object" &&
                    selectedRecord.punchIn.selfieUrl ? (
                      <img
                        src={selectedRecord.punchIn.selfieUrl}
                        alt="In selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                        No Photo
                      </div>
                    )}
                  </div>
                  {typeof selectedRecord.punchIn === "object" && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      GPS: {selectedRecord.punchIn.lat.toFixed(4)},{" "}
                      {selectedRecord.punchIn.lng.toFixed(4)}
                    </div>
                  )}
                </div>

                {/* Punch Out Photo */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    Punch-Out Verification Photo
                  </span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {selectedRecord.punchOut &&
                    typeof selectedRecord.punchOut === "object" &&
                    selectedRecord.punchOut.selfieUrl ? (
                      <img
                        src={selectedRecord.punchOut.selfieUrl}
                        alt="Out selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                        No Photo
                      </div>
                    )}
                  </div>
                  {selectedRecord.punchOut && typeof selectedRecord.punchOut === "object" && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      GPS: {selectedRecord.punchOut.lat.toFixed(4)},{" "}
                      {selectedRecord.punchOut.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Notes */}
              {selectedRecord.validation?.remarks && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Validator Remarks:
                  </span>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {selectedRecord.validation.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <DrawerFooter className="px-0 pt-2">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl text-xs">
                Close Drawer
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Claim Overtime Dialog */}
      <Dialog open={otModalOpen} onOpenChange={setOtModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <form onSubmit={handleSubmitOt}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Request Overtime Approval</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Submit an overtime request for manager review. Once approved, it reflects on your
                attendance log.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Overtime Hours Claimed</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="12"
                  value={otHours}
                  onChange={(e) => setOtHours(parseFloat(e.target.value) || 0)}
                  className="rounded-xl h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Reason for Overtime</Label>
                <Textarea
                  placeholder="e.g. Critical bug fixing for production release..."
                  value={otReason}
                  onChange={(e) => setOtReason(e.target.value)}
                  className="rounded-xl text-xs h-20"
                  required
                />
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOtModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRequestingOt}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
