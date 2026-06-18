import env from "../config/env.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  const response = {
    status,
    message: err.message || "Internal Server Error",
  };

  if (env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
