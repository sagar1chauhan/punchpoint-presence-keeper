import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendError } from "../utils/response.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Authentication required. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "punchpoint-dev-super-secret-key-32chars";

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return sendError(res, "Invalid or expired token.", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, "User no longer exists.", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Account has been deactivated. Please contact an administrator.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        403
      );
    }

    next();
  };
};
