import express from "express";
import { getUsers, createUser, updateUser } from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("manager", "admin"), getUsers);
router.post("/", authorize("admin"), createUser);
router.patch("/:id", authorize("admin"), updateUser);

export default router;
