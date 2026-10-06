"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../index.js");
const ApiError_js_1 = __importDefault(require("../utils/ApiError.js"));
const asyncHandler_js_1 = __importDefault(require("../utils/asyncHandler.js"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roleAccessMiddleware = (0, asyncHandler_js_1.default)(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError_js_1.default(404, "Unauthorized request");
    }
    const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken?.id) {
        throw new ApiError_js_1.default(401, "unauthorized request");
    }
    const user = await index_js_1.prisma.user.findUnique({
        where: {
            id: decodedToken.id
        },
    });
    if (!user) {
        throw new ApiError_js_1.default(400, "user not found");
    }
    req.user = user;
    next();
});
