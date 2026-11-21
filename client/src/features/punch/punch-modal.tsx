import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePunchInMutation, usePunchOutMutation, useGetMyAttendanceQuery } from "@/services/api";

interface PunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PunchModal({ open, onOpenChange }: PunchModalProps) {
  const [punchInMut, { isLoading: isPunchingIn }] = usePunchInMutation();
  const [punchOutMut, { isLoading: isPunchingOut }] = usePunchOutMutation();
  const { data: attendanceList = [] } = useGetMyAttendanceQuery();

  // Determine current day punch state
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = attendanceList.find((r) => r.date === todayStr);
  const hasPunchedIn = Boolean(todayRecord && todayRecord.punchIn);
  const hasPunchedOut = Boolean(todayRecord && todayRecord.punchOut);
  const isPunchOutFlow = hasPunchedIn && !hasPunchedOut;

  // Camera & Geolocation State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(
    null,
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<string>("");

  // Step: "capture" | "review" | "success"
  const [step, setStep] = useState<"capture" | "review" | "success">("capture");

  // Request camera & location when modal opens
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Camera permission denied or camera not found";
      setCameraError(msg);
    }
  }, []);

  const fetchLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        setLocationError(`Location error: ${err.message}. Please enable location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (open) {
      setCapturedPhoto(null);
      setIsSuccess(false);
      setStep("capture");
      void startCamera();
      fetchLocation();
    } else {
      // Clean up camera stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [open]);

  // Take photo from video stream
  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
      setStep("review");
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setStep("capture");
    void startCamera();
  };

  const handleSubmitPunch = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture a live photo first.");
      return;
    }
    if (!location) {
      toast.error("Location coordinate required. Please enable location.");
      return;
    }

    try {
      if (isPunchOutFlow) {
        const res = await punchOutMut({
          lat: location.lat,
          lng: location.lng,
          selfieUrl: capturedPhoto,
        }).unwrap();
        setSuccessDetails(
          `Clocked out successfully! Total shift duration: ${res.attendance.totalHours ?? 0}h (${res.attendance.shiftStatus === "completed" ? "Completed shift ≥ 8h" : "Incomplete shift < 8h"}).`,
        );
      } else {
        await punchInMut({
          lat: location.lat,
          lng: location.lng,
          selfieUrl: capturedPhoto,
        }).unwrap();
        setSuccessDetails("Clocked in successfully! Have a productive workday.");
      }
      setStep("success");
      setIsSuccess(true);
      toast.success(isPunchOutFlow ? "Punch-out recorded!" : "Punch-in recorded!");
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || "Punch failed. Please try again.");
    }
  };

  const isSubmitting = isPunchingIn || isPunchingOut;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-600" />
              {isPunchOutFlow ? "Punch Out (Shift Check-Out)" : "Punch In (Shift Check-In)"}
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                isPunchOutFlow
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                  : "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              }
            >
              {isPunchOutFlow ? "Shift Punch-Out" : "Daily Punch-In"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Live photo verification and GPS coordinates are strictly verified by our security
            engine.
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Step View */}
        <div className="mt-4 flex flex-col items-center">
          {step === "capture" && (
            <div className="w-full flex flex-col items-center gap-4">
              {/* Camera Feed Viewport */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-indigo-500/30 flex items-center justify-center shadow-inner">
                {cameraError ? (
                  <div className="p-6 text-center text-white flex flex-col items-center gap-2">
                    <ShieldAlert className="h-10 w-10 text-rose-400" />
                    <p className="text-sm font-semibold">Camera Access Denied</p>
                    <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void startCamera()}
                      className="mt-2 text-xs"
                    >
                      Retry Camera
                    </Button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    {/* Face Oval Overlay Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-60 rounded-[50%] border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                        <span className="text-[11px] font-medium text-white/80 bg-black/40 px-2 py-0.5 rounded-full -mt-44">
                          Position Face Inside
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Location Status Pill */}
              <div className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                <div className="flex items-center gap-2 truncate">
                  <MapPin
                    className={`h-4 w-4 shrink-0 ${location ? "text-emerald-500" : "text-amber-500"}`}
                  />
                  {location ? (
                    <span className="truncate">
                      GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </span>
                  ) : locationError ? (
                    <span className="text-rose-500 truncate max-w-[180px]">{locationError}</span>
                  ) : (
                    <span className="text-slate-400 animate-pulse">Detecting GPS location...</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-indigo-600 dark:text-indigo-400"
                    onClick={() => setLocation({ lat: 28.6139, lng: 77.209, accuracy: 5 })}
                    title="Simulate Office GPS (New Delhi Office)"
                  >
                    Office GPS
                  </Button>
                  {!location && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      onClick={fetchLocation}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>

              {/* Capture Button */}
              <Button
                onClick={handleCapture}
                disabled={Boolean(cameraError)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-md shadow-indigo-600/20 text-sm flex items-center justify-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Capture Live Photo
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                {capturedPhoto && (
                  <img
                    src={capturedPhoto}
                    alt="Captured selfie preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <Badge className="absolute top-3 left-3 bg-black/60 text-white backdrop-blur-sm text-xs">
                  Photo Captured
                </Badge>
              </div>

              <div className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                <span className="text-slate-500">Target Action:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {isPunchOutFlow ? "Record Punch-Out" : "Record Punch-In"}
                </span>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="rounded-xl h-11 text-xs font-medium"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retake Photo
                </Button>
                <Button
                  onClick={() => void handleSubmitPunch()}
                  disabled={isSubmitting}
                  className="rounded-xl h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md shadow-emerald-600/20 text-xs"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isPunchOutFlow ? "Confirm Punch Out" : "Confirm Punch In"}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8 flex flex-col items-center text-center gap-4"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Attendance Recorded!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  {successDetails}
                </p>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                className="mt-2 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                Done
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
