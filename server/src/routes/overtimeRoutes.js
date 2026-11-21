import express from "express";
import {
  createOvertime,
  getMyOvertime,
  getPendingOvertime,
  reviewOvertime,
} from "../controllers/overtimeController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/", createOvertime);
router.get("/me", getMyOvertime);
router.get("/pending", authorize("manager", "admin"), getPendingOvertime);
router.patch("/:id", authorize("manager", "admin"), reviewOvertime);

export default router;
