import { sendError } from "../utils/response.js";

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors) {
      const formatted = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return sendError(res, "Validation failed", 400, formatted);
    }
    return sendError(res, error.message || "Invalid input", 400);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error.errors) {
      const formatted = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return sendError(res, "Query validation failed", 400, formatted);
    }
    return sendError(res, error.message || "Invalid query parameters", 400);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    if (error.errors) {
      const formatted = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return sendError(res, "Parameter validation failed", 400, formatted);
    }
    return sendError(res, error.message || "Invalid route parameters", 400);
  }
};
