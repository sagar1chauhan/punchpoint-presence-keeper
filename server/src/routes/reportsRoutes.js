import express from "express";
import { getDailyReport } from "../controllers/reportsController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);
router.get("/daily", getDailyReport);

export default router;
