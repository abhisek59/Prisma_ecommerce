class ApiError extends Error {
  constructor(
    message="Something went wrong",
     statusCode,
    errors=[],
    stack = ""
) {
    super(message)
    this.statusCode = statusCode;
    this.isOperational = true;
    this.sucess = false;
    this.data = null;
    this.message = message;
    this.statusCode = statusCode;
    this.errors = errors;
    this.stack = stack || new Error().stack;

    if (this.stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError }

