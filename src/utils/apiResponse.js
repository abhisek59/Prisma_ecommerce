class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.sucess= statusCode < 400 && statusCode < 300;
  }

  static success(data) {
    return new ApiResponse(200, 'Success', data);
  }

  static error(message, statusCode = 500) {
    return new ApiResponse(statusCode, message);
  }
}
export { ApiResponse };

 