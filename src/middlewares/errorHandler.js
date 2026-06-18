import env from "../config/env.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || "error";
  let message = err.message || "Internal Server Error";

  // Handle Postgres unique constraint violation
  if (err.code === "23505") {
    statusCode = 400;
    status = "fail";
    if (err.detail && err.detail.includes("email")) {
      message = "Email address is already in use. Please choose another one.";
    } else {
      message = "The record already exists.";
    }
  }
  // Handle foreign key violation
  else if (err.code === "23503") {
    statusCode = 400;
    status = "fail";
    message = "Invalid reference key. The related record does not exist.";
  }
  // Handle connection failures
  else if (err.code && err.code.startsWith("08")) {
    statusCode = 503;
    message = "Database connection error. Please try again later.";
  }
  // Generic fallback mask in production for unexpected errors
  else if (!err.statusCode && env.NODE_ENV === "production") {
    message = "An unexpected error occurred. Please try again.";
  }

  const response = {
    status,
    message,
  };

  if (env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
