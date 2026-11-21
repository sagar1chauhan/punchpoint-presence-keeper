import express from "express";
import {
  punchIn,
  punchOut,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  validateAttendance,
} from "../controllers/attendanceController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/punch-in", punchIn);
router.post("/punch-out", punchOut);
router.get("/me", getMyAttendance);
router.get("/team", authorize("manager", "admin"), getTeamAttendance);
router.get("/all", authorize("admin"), getAllAttendance);
router.patch("/:id/validate", authorize("manager", "admin"), validateAttendance);

export default router;
