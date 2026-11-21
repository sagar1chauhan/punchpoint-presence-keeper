export const sendResponse = (res, statusCode, success, data = null, message = "", pagination = null) => {
  const response = {
    success,
    data,
    message,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
};

export const sendSuccess = (res, data = null, message = "Operation successful", statusCode = 200, pagination = null) => {
  return sendResponse(res, statusCode, true, data, message, pagination);
};

export const sendError = (res, message = "An error occurred", statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors,
  });
};
