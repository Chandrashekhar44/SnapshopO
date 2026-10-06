"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiResponse {
    statusCode;
    data;
    message;
    success;
    constructor(statusCode, data, message = 'success') {
        this.statusCode = statusCode,
            this.data = data,
            this.message = message,
            this.success = statusCode < 400;
    }
}
exports.default = ApiResponse;
//# sourceMappingURL=ApiResponse.js.map