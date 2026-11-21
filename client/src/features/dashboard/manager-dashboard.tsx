import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { User } from "@/types/attendance";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetTeamAttendanceQuery,
  useGetPendingOvertimeQuery,
  useReviewOvertimeMutation,
  useValidateAttendanceMutation,
} from "@/services/api";
import { resolveSelfieUrl } from "@/lib/utils";

interface ManagerDashboardProps {
  user: User;
}

export function ManagerDashboard({ user }: ManagerDashboardProps) {
  const { data: teamAttendance = [], isLoading: isLoadingAttendance } = useGetTeamAttendanceQuery();
  const { data: pendingOvertime = [], isLoading: isLoadingOt } = useGetPendingOvertimeQuery();
  const [reviewOt, { isLoading: isReviewingOt }] = useReviewOvertimeMutation();
  const [validateAttendance, { isLoading: isValidating }] = useValidateAttendanceMutation();

  // Rejection Dialog State
  const [rejectDialogState, setRejectDialogState] = useState<{
    open: boolean;
    otId: string | null;
    note: string;
  }>({
    open: false,
    otId: null,
    note: "",
  });

  // Validation Remarks Dialog State
  const [invalidDialogState, setInvalidDialogState] = useState<{
    open: boolean;
    attId: string | null;
    remarks: string;
  }>({
    open: false,
    attId: null,
    remarks: "",
  });

  // Photo Lightbox Dialog
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const teamToday = teamAttendance.filter((r) => r.date === todayStr);
  const presentCount = teamToday.length;
  const completedShifts = teamAttendance.filter((r) => r.shiftStatus === "completed").length;
  const pendingValidations = teamAttendance.filter((r) => r.validationStatus === "pending");

  const handleApproveOt = async (id: string) => {
    try {
      await reviewOt({
        id,
        body: { status: "approved", reviewNote: "Approved by manager" },
      }).unwrap();
      toast.success("Overtime request approved.");
    } catch {
      toast.error("Failed to approve overtime request.");
    }
  };

  const handleConfirmRejectOt = async () => {
    if (!rejectDialogState.otId) return;
    try {
      await reviewOt({
        id: rejectDialogState.otId,
        body: { status: "rejected", reviewNote: rejectDialogState.note || "Overtime rejected" },
      }).unwrap();
      toast.success("Overtime request rejected.");
      setRejectDialogState({ open: false, otId: null, note: "" });
    } catch {
      toast.error("Failed to reject overtime request.");
    }
  };

  const handleMarkValid = async (id: string) => {
    try {
      await validateAttendance({
        id,
        body: { status: "valid", remarks: "Photo & GPS verified by manager" },
      }).unwrap();
      toast.success("Attendance marked as Valid.");
    } catch {
      toast.error("Failed to mark attendance valid.");
    }
  };

  const handleConfirmMarkInvalid = async () => {
    if (!invalidDialogState.attId) return;
    if (!invalidDialogState.remarks.trim()) {
      toast.error("Remarks are required when marking attendance as Invalid.");
      return;
    }
    try {
      await validateAttendance({
        id: invalidDialogState.attId,
        body: { status: "invalid", remarks: invalidDialogState.remarks },
      }).unwrap();
      toast.success("Attendance marked as Invalid.");
      setInvalidDialogState({ open: false, attId: null, remarks: "" });
    } catch {
      toast.error("Failed to update attendance.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management Dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your direct reports' check-ins, approve overtime requests, and verify attendance
          authenticity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Team Checked-In Today</span>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
            {presentCount}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            Active on today's shift
          </span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Pending Overtime Requests</span>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {pendingOvertime.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Requires review</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Pending Photo Validations</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {pendingValidations.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting photo inspection</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 p-4">
          <span className="text-xs text-slate-500 font-medium">Completed Shifts (≥8h)</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {completedShifts}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Full standard days</span>
        </Card>
      </div>

      {/* Pending Overtime Review Queue */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Overtime Approval Queue
            </CardTitle>
            <CardDescription className="text-xs">
              Employees requesting overtime approval for extended shifts
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {pendingOvertime.length} Pending
          </Badge>
        </div>

        {pendingOvertime.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No pending overtime requests for your team.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">OT Hours</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOvertime.map((ot) => (
                  <TableRow key={ot.id} className="text-xs">
                    <TableCell className="font-semibold">{ot.user?.name || "Teammate"}</TableCell>
                    <TableCell>{ot.date}</TableCell>
                    <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">
                      +{ot.hours}h
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600 dark:text-slate-400">
                      {ot.reason}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => void handleApproveOt(ot.id)}
                        disabled={isReviewingOt}
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectDialogState({ open: true, otId: ot.id, note: "" })}
                        disabled={isReviewingOt}
                        className="h-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs px-3"
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pending Validation Queue */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              Attendance Authenticity Validation
            </CardTitle>
            <CardDescription className="text-xs">
              Verify employee selfies &amp; GPS coordinates. Mark Valid or Invalid with remarks.
            </CardDescription>
          </div>
          <Link to="/validation">
            <Button variant="ghost" size="sm" className="text-xs">
              Open Validation Studio <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Punch Selfie</TableHead>
                <TableHead className="text-xs">Hours</TableHead>
                <TableHead className="text-xs">Shift Status</TableHead>
                <TableHead className="text-xs">Validation</TableHead>
                <TableHead className="text-xs text-right">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamAttendance.slice(0, 6).map((record) => {
                const selfieUrl =
                  typeof record.punchIn === "object" ? record.punchIn.selfieUrl : null;

                return (
                  <TableRow key={record.id} className="text-xs">
                    <TableCell className="font-semibold">
                      {record.user?.name || "Teammate"}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      {selfieUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(resolveSelfieUrl(selfieUrl))}
                          className="relative group h-9 w-9 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-indigo-500 transition-all"
                        >
                          <img
                            src={resolveSelfieUrl(selfieUrl)}
                            alt="Selfie"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="h-3 w-3" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{record.hours}h</TableCell>
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
                    <TableCell className="text-right space-x-2">
                      {record.validationStatus === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void handleMarkValid(record.id)}
                            disabled={isValidating}
                            className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3"
                          >
                            Mark Valid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setInvalidDialogState({ open: true, attId: record.id, remarks: "" })
                            }
                            disabled={isValidating}
                            className="h-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs px-3"
                          >
                            Invalid
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Validated</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Rejection Note Dialog */}
      <Dialog
        open={rejectDialogState.open}
        onOpenChange={(open) => setRejectDialogState((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reject Overtime Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please provide an explanation for rejecting this overtime request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="e.g. Overtime was not pre-approved by department manager..."
              value={rejectDialogState.note}
              onChange={(e) => setRejectDialogState((prev) => ({ ...prev, note: e.target.value }))}
              className="rounded-xl text-xs h-24"
            />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogState({ open: false, otId: null, note: "" })}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmRejectOt()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invalid Attendance Dialog */}
      <Dialog
        open={invalidDialogState.open}
        onOpenChange={(open) => setInvalidDialogState((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Mark Attendance as Invalid</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Remarks are strictly required when flagging attendance as suspicious or invalid.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="Reason for invalidating: e.g. Face obscured in selfie photo..."
              value={invalidDialogState.remarks}
              onChange={(e) =>
                setInvalidDialogState((prev) => ({ ...prev, remarks: e.target.value }))
              }
              className="rounded-xl text-xs h-24"
              required
            />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setInvalidDialogState({ open: false, attId: null, remarks: "" })}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmMarkInvalid()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Flag Invalid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox Dialog */}
      {lightboxUrl && (
        <Dialog open={Boolean(lightboxUrl)} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-4 overflow-hidden">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={lightboxUrl}
                alt="Enlarged selfie"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-slate-400">High-Resolution Photo Verification</span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
