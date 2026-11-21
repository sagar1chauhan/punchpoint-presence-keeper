import { useState } from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";

import { User } from "@/types/attendance";
import { useAppSelector } from "@/app/hooks";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetMyOvertimeQuery,
  useGetPendingOvertimeQuery,
  useReviewOvertimeMutation,
} from "@/services/api";

export function OvertimeView() {
  const { user } = useAppSelector((state) => state.auth);
  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  const { data: myOt = [], isLoading: isLoadingMyOt } = useGetMyOvertimeQuery();
  const { data: pendingOt = [], isLoading: isLoadingPending } = useGetPendingOvertimeQuery(
    undefined,
    {
      skip: !isManagerOrAdmin,
    },
  );

  const [reviewOt, { isLoading: isReviewing }] = useReviewOvertimeMutation();

  // Reject Note Dialog
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    otId: string | null;
    note: string;
  }>({
    open: false,
    otId: null,
    note: "",
  });

  const handleApprove = async (id: string) => {
    try {
      await reviewOt({ id, body: { status: "approved", reviewNote: "Approved" } }).unwrap();
      toast.success("Overtime request approved.");
    } catch {
      toast.error("Failed to approve overtime request.");
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectDialog.otId) return;
    try {
      await reviewOt({
        id: rejectDialog.otId,
        body: { status: "rejected", reviewNote: rejectDialog.note || "Overtime rejected" },
      }).unwrap();
      toast.success("Overtime request rejected.");
      setRejectDialog({ open: false, otId: null, note: "" });
    } catch {
      toast.error("Failed to reject overtime request.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-600" />
          Overtime Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Track overtime claims, review pending team submissions, and monitor approval workflows.
        </p>
      </div>

      <Tabs defaultValue={isManagerOrAdmin && pendingOt.length > 0 ? "queue" : "my"}>
        {isManagerOrAdmin && (
          <TabsList className="rounded-2xl p-1 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="queue" className="rounded-xl text-xs font-semibold">
              Team Review Queue ({pendingOt.length})
            </TabsTrigger>
            <TabsTrigger value="my" className="rounded-xl text-xs font-semibold">
              My Personal Requests ({myOt.length})
            </TabsTrigger>
          </TabsList>
        )}

        {/* Manager/Admin Review Queue */}
        {isManagerOrAdmin && (
          <TabsContent value="queue" className="mt-4">
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base font-bold">Pending Overtime Claims</CardTitle>
                <CardDescription className="text-xs">
                  Review shift overtime submissions from your direct reports
                </CardDescription>
              </CardHeader>

              {pendingOt.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No overtime requests awaiting review.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Teammate</TableHead>
                        <TableHead className="text-xs">Shift Date</TableHead>
                        <TableHead className="text-xs">Hours Claimed</TableHead>
                        <TableHead className="text-xs">Stated Reason</TableHead>
                        <TableHead className="text-xs text-right">Review Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOt.map((ot) => (
                        <TableRow key={ot.id} className="text-xs">
                          <TableCell className="font-semibold">
                            {ot.user?.name || "Employee"}
                          </TableCell>
                          <TableCell>{ot.date}</TableCell>
                          <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">
                            +{ot.hours}h
                          </TableCell>
                          <TableCell className="max-w-md text-slate-600 dark:text-slate-300 leading-relaxed">
                            {ot.reason}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => void handleApprove(ot.id)}
                              disabled={isReviewing}
                              className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectDialog({ open: true, otId: ot.id, note: "" })}
                              disabled={isReviewing}
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
          </TabsContent>
        )}

        {/* My Personal Requests */}
        <TabsContent value="my" className="mt-4">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base font-bold">My Overtime Requests Log</CardTitle>
              <CardDescription className="text-xs">
                History of overtime hours submitted and their synchronization status
              </CardDescription>
            </CardHeader>

            {myOt.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                You have not submitted any overtime requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Shift Date</TableHead>
                      <TableHead className="text-xs">Hours</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Reviewer Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myOt.map((ot) => (
                      <TableRow key={ot.id} className="text-xs">
                        <TableCell className="font-semibold">{ot.date}</TableCell>
                        <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">
                          +{ot.hours}h
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{ot.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              ot.status === "approved"
                                ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                                : ot.status === "rejected"
                                  ? "border-rose-500 text-rose-600 bg-rose-500/10"
                                  : "border-amber-500 text-amber-600 bg-amber-500/10"
                            }
                          >
                            {ot.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-[11px]">
                          {ot.reviewNote || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reject Overtime</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please enter a brief reason for declining this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="e.g. Overtime was not pre-authorized by team lead..."
              value={rejectDialog.note}
              onChange={(e) => setRejectDialog((prev) => ({ ...prev, note: e.target.value }))}
              className="rounded-xl text-xs h-24"
            />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, otId: null, note: "" })}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmReject()}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
