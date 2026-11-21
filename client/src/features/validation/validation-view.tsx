import { useState } from "react";
import { UserCheck, ShieldAlert, CheckCircle2, Eye, MapPin, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { AttendanceRecord } from "@/types/attendance";
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
import {
  useGetTeamAttendanceQuery,
  useGetAllAttendanceQuery,
  useValidateAttendanceMutation,
} from "@/services/api";
import { resolveSelfieUrl } from "@/lib/utils";

export function ValidationView() {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const { data: teamAtt = [] } = useGetTeamAttendanceQuery(undefined, { skip: isAdmin });
  const { data: allAtt = [] } = useGetAllAttendanceQuery(undefined, { skip: !isAdmin });
  const records = isAdmin ? allAtt : teamAtt;

  const [validateMut, { isLoading: isValidating }] = useValidateAttendanceMutation();

  // Photo Lightbox & Inspection State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [zoomSelfieUrl, setZoomSelfieUrl] = useState<string | null>(null);

  // Invalid Dialog State
  const [invalidDialog, setInvalidDialog] = useState<{
    open: boolean;
    attId: string | null;
    remarks: string;
  }>({
    open: false,
    attId: null,
    remarks: "",
  });

  const handleMarkValid = async (id: string) => {
    try {
      await validateMut({
        id,
        body: { status: "valid", remarks: "Photo and GPS authenticity confirmed." },
      }).unwrap();
      toast.success("Attendance marked as Valid.");
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch {
      toast.error("Failed to mark attendance as valid.");
    }
  };

  const handleConfirmInvalid = async () => {
    if (!invalidDialog.attId) return;
    if (!invalidDialog.remarks.trim()) {
      toast.error("Remarks are mandatory when marking attendance as Invalid.");
      return;
    }

    try {
      await validateMut({
        id: invalidDialog.attId,
        body: { status: "invalid", remarks: invalidDialog.remarks },
      }).unwrap();
      toast.success("Attendance marked as Invalid (suspicious/fake flagged).");
      setInvalidDialog({ open: false, attId: null, remarks: "" });
      if (selectedRecord?.id === invalidDialog.attId) {
        setSelectedRecord(null);
      }
    } catch {
      toast.error("Failed to mark attendance as invalid.");
    }
  };

  const pendingRecords = records.filter((r) => r.validationStatus === "pending");

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-indigo-600" />
          Attendance Authenticity Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify employee selfie authenticity, examine GPS coordinates, and mark attendance as Valid
          or Invalid.
        </p>
      </div>

      {/* Main Studio Card */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-base font-bold">Attendance Records Queue</CardTitle>
            <CardDescription className="text-xs">
              Showing {pendingRecords.length} pending verification records
            </CardDescription>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Punch Selfie</TableHead>
                <TableHead className="text-xs">GPS Coordinates</TableHead>
                <TableHead className="text-xs">Hours</TableHead>
                <TableHead className="text-xs">Current Status</TableHead>
                <TableHead className="text-xs text-right">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => {
                const selfieUrl = typeof rec.punchIn === "object" ? rec.punchIn.selfieUrl : null;
                const coords =
                  typeof rec.punchIn === "object"
                    ? `${rec.punchIn.lat.toFixed(4)}, ${rec.punchIn.lng.toFixed(4)}`
                    : "—";

                return (
                  <TableRow
                    key={rec.id}
                    className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="font-semibold">{rec.user?.name || "Employee"}</TableCell>
                    <TableCell>{rec.date}</TableCell>
                    <TableCell>
                      {selfieUrl ? (
                        <button
                          type="button"
                          onClick={() => setZoomSelfieUrl(resolveSelfieUrl(selfieUrl))}
                          className="relative group h-10 w-10 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-indigo-500 transition-all"
                        >
                          <img
                            src={resolveSelfieUrl(selfieUrl)}
                            alt="Selfie"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        {coords}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{rec.hours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          rec.validationStatus === "valid"
                            ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                            : rec.validationStatus === "invalid"
                              ? "border-rose-500 text-rose-600 bg-rose-500/10"
                              : "border-slate-400 text-slate-500"
                        }
                      >
                        {rec.validationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => void handleMarkValid(rec.id)}
                        disabled={isValidating}
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                      >
                        Valid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInvalidDialog({ open: true, attId: rec.id, remarks: "" })}
                        disabled={isValidating}
                        className="h-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs px-3"
                      >
                        Invalid
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Invalid Remarks Dialog */}
      <Dialog
        open={invalidDialog.open}
        onOpenChange={(open) => setInvalidDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Mark Attendance as Invalid</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Remarks are strictly mandatory. Explain why this punch is deemed fake or suspicious.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              placeholder="e.g. Photo obscured / selfie does not match employee record..."
              value={invalidDialog.remarks}
              onChange={(e) => setInvalidDialog((prev) => ({ ...prev, remarks: e.target.value }))}
              className="rounded-xl text-xs h-24"
              required
            />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setInvalidDialog({ open: false, attId: null, remarks: "" })}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmInvalid()}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              Mark Invalid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Zoom Lightbox Dialog */}
      {zoomSelfieUrl && (
        <Dialog open={Boolean(zoomSelfieUrl)} onOpenChange={() => setZoomSelfieUrl(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-4 overflow-hidden">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={zoomSelfieUrl}
                alt="Zoomed selfie"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center mt-2 text-xs text-slate-400">
              Selfie Authenticity Verification View
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
