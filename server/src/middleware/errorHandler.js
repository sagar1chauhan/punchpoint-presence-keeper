import logger from "../logger/logger.js";
import { sendError } from "../utils/response.js";

export const errorHandler = (err, req, res, _next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return sendError(res, `Duplicate value for '${field}'. Already exists.`, 409);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, "Validation failed", 400, errors);
  }

  // Mongoose invalid ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return sendError(res, `Invalid ID format for ${err.path}`, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid authentication token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return sendError(res, "Authentication token has expired", 401);
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal Server Error" : err.message;
  return sendError(res, message, statusCode);
};
