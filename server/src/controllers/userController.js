import { z } from "zod";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendError, sendSuccess } from "../utils/response.js";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "manager", "admin"]),
  team: z.string().optional().default("General"),
  managerId: z.string().nullable().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  team: z.string().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const getUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { team: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    // If manager is requesting and not admin, manager only views their team or all employees for assignment
    if (req.user.role === "manager") {
      filter.$or = [{ managerId: req.user._id }, { _id: req.user._id }];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).populate("managerId", "name email"),
      User.countDocuments(filter),
    ]);

    const formatted = users.map((u) => {
      const obj = u.toJSON();
      if (u.managerId) {
        obj.manager = { id: u.managerId._id, name: u.managerId.name, email: u.managerId.email };
      }
      return obj;
    });

    return sendSuccess(res, formatted, "Users retrieved", 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { name, email, password, role, team, managerId } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, "A user with this email already exists", 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      team,
      managerId: managerId || null,
    });

    return sendSuccess(res, user.toJSON(), "User created successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404);
    }

    const updates = parsed.data;
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email.toLowerCase();
    if (updates.role) user.role = updates.role;
    if (updates.team) user.team = updates.team;
    if (updates.managerId !== undefined) user.managerId = updates.managerId || null;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updates.password, salt);
    }

    await user.save();
    return sendSuccess(res, user.toJSON(), "User updated successfully");
  } catch (error) {
    next(error);
  }
};
