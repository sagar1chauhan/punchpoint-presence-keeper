import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { sendError, sendSuccess } from "../utils/response.js";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  team: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || "punchpoint-dev-super-secret-key-32chars";
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

export const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { name, email, password, role: requestedRole, team } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, "An account with this email already exists", 409);
    }

    // Role security rule: in production or unless ALLOW_DEMO_ROLES=true, force 'employee'
    let assignedRole = "employee";
    if (process.env.ALLOW_DEMO_ROLES === "true" && requestedRole) {
      assignedRole = requestedRole;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: assignedRole,
      team: team || (assignedRole === "admin" ? "People Operations" : "Product Engineering"),
    });

    const token = generateToken(user);

    return sendSuccess(
      res,
      { token, user: user.toJSON() },
      "Registration successful",
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, "Validation error", 400, parsed.error.errors);
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, "Invalid email or password", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Your account has been deactivated. Please contact HR or admin.", 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, "Invalid email or password", 401);
    }

    const token = generateToken(user);

    return sendSuccess(
      res,
      { token, user: user.toJSON() },
      `Welcome back, ${user.name}`
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, req.user.toJSON(), "User profile retrieved");
  } catch (error) {
    next(error);
  }
};
