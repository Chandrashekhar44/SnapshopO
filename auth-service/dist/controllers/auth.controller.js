"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHandler = exports.getMe = exports.getCurrentUser = exports.logoutUser = exports.loginUser = exports.signup = exports.refreshTokenHandler = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const userFunction_1 = require("../utils/userFunction");
const index_1 = require("../index");
const ApiResponse_1 = __importDefault(require("../utils/ApiResponse"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userFunction_2 = require("../utils/userFunction");
const userFunction_3 = require("../utils/userFunction");
const redis_config_1 = require("../config/redis.config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const session_1 = require("../utils/session");
const cookies_1 = require("../config/cookies");
const crypto_1 = __importDefault(require("crypto"));
const hashToken = (token) => {
    return crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
};
exports.refreshTokenHandler = (0, asyncHandler_1.default)(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        console.log("No refresh token found in cookies");
        throw new ApiError_1.default(401, "Unauthorized");
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    }
    catch (error) {
        console.log("JWT verification failed");
        console.log(error);
        throw new ApiError_1.default(401, "Refresh token expired or invalid");
    }
    console.log("3. Checking session in Redis...");
    const storedHash = await (0, session_1.getRefreshSession)(decoded.id, decoded.sessionId);
    console.log("Stored hash exists:", !!storedHash);
    if (!storedHash) {
        console.log("Session not found in Redis");
        throw new ApiError_1.default(401, "Session not found");
    }
    console.log("4. Comparing refresh token hash...");
    const incomingHash = hashToken(refreshToken);
    console.log("Incoming Hash:", incomingHash.substring(0, 20) + "...");
    console.log("Stored Hash:", storedHash.substring(0, 20) + "...");
    if (incomingHash !== storedHash) {
        console.log("Hash mismatch - deleting session");
        await (0, session_1.deleteRefreshSession)(decoded.id, decoded.sessionId);
        throw new ApiError_1.default(401, "Invalid session");
    }
    const user = await index_1.prisma.user.findUnique({
        where: {
            id: decoded.id,
        },
    });
    console.log("User found:", !!user);
    if (!user) {
        console.log("User does not exist, deleting session");
        await (0, session_1.deleteRefreshSession)(decoded.id, decoded.sessionId);
        throw new ApiError_1.default(401, "User not found");
    }
    console.log("User:", {
        id: user.id,
        email: user.email,
        role: user.role,
    });
    console.log("6. Rotating refresh session...");
    await (0, session_1.deleteRefreshSession)(user.id, decoded.sessionId);
    console.log("Old session deleted");
    const newSessionId = (0, userFunction_1.generateSessionId)();
    const newRefreshToken = (0, userFunction_3.generateRefreshToken)(user, newSessionId);
    const newHash = hashToken(newRefreshToken);
    await (0, session_1.saveRefreshSession)(user.id, newSessionId, newHash);
    const newAccessToken = (0, userFunction_2.generateAccessToken)(user);
    return res
        .status(200)
        .cookie("accessToken", newAccessToken, cookies_1.accessCookieOptions)
        .cookie("refreshToken", newRefreshToken, cookies_1.refreshCookieOptions)
        .json(new ApiResponse_1.default(200, {}, "Token refreshed successfully"));
});
exports.signup = (0, asyncHandler_1.default)(async (req, res) => {
    const { username, email, address, password, category, role, latitude, longitude } = req.body;
    if (!username || !email || !address || !password || !category || !role) {
        throw new ApiError_1.default(400, "All fields are required");
    }
    if (latitude == null || longitude == null) {
        throw new ApiError_1.default(400, "Enable location access");
    }
    const existedUser = await index_1.prisma.user.findFirst({
        where: {
            OR: [{ email }, { username }]
        }
    });
    if (existedUser) {
        throw new ApiError_1.default(400, "User already exists");
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const user = await index_1.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: {
                username,
                email,
                address,
                password: hashedPassword,
                category,
                role,
                latitude,
                longitude,
            }
        });
        if (role === "SELLER") {
            await tx.seller.create({
                data: {
                    shopName: createdUser.username,
                    shopAddress: createdUser.address,
                    latitude: createdUser.latitude,
                    longitude: createdUser.longitude,
                    shopCategory: createdUser.category,
                    userId: createdUser.id
                }
            });
        }
        if (role === "BUYER") {
            await tx.buyer.create({
                data: {
                    userId: createdUser.id,
                    latitude: createdUser.latitude,
                    longitude: createdUser.longitude
                }
            });
        }
        return createdUser;
    });
    const createdUser = await index_1.prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            role: true
        },
    });
    return res.status(201).json(new ApiResponse_1.default(201, createdUser, "User created successfully"));
});
exports.loginUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        throw new ApiError_1.default(400, "All fields are required");
    }
    const user = await index_1.prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { username: identifier },
            ],
        },
    });
    if (!user) {
        throw new ApiError_1.default(400, "User not found");
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError_1.default(400, "Invalid password");
    }
    const accessToken = (0, userFunction_2.generateAccessToken)(user);
    const sessionId = (0, userFunction_1.generateSessionId)();
    const refreshToken = (0, userFunction_3.generateRefreshToken)(user, sessionId);
    const hashedRefreshToken = hashToken(refreshToken);
    await (0, session_1.saveRefreshSession)(user.id, sessionId, hashedRefreshToken);
    const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookies_1.accessCookieOptions)
        .cookie("refreshToken", refreshToken, cookies_1.refreshCookieOptions)
        .json(new ApiResponse_1.default(200, safeUser, "Login successful"));
});
exports.logoutUser = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user?.id) {
        throw new ApiError_1.default(401, "Unauthorized");
    }
    console.log(req.user.username, "logged out successfully");
    return res
        .clearCookie("accessToken", cookies_1.accessCookieOptions)
        .clearCookie("refreshToken", cookies_1.refreshCookieOptions)
        .status(200)
        .json(new ApiResponse_1.default(200, {}, "User logged out successfully"));
});
exports.getCurrentUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
        throw new ApiError_1.default(404, "Invalid userid or user not found");
    }
    const cachekey = `user:${id}`;
    const cachedData = await redis_config_1.client.get(cachekey);
    if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return res.status(200).json(new ApiResponse_1.default(200, parsed, "Fetched cache data successfully"));
    }
    const currUser = await index_1.prisma.user.findUnique({
        where: {
            id: Number(id)
        }
    });
    if (!currUser) {
        throw new ApiError_1.default(400, "User not found");
    }
    const responseData = {
        username: currUser.username,
        email: currUser.email,
        address: currUser.address,
        category: currUser.category,
    };
    if (responseData) {
        await redis_config_1.client.set(cachekey, JSON.stringify(responseData), "EX", 60);
    }
    return res.status(200).json(new ApiResponse_1.default(200, responseData, "Fetched current user successfully"));
});
exports.getMe = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user) {
        throw new ApiError_1.default(401, "Unauthorized");
    }
    return res.status(200).json(new ApiResponse_1.default(200, req.user, "User fetched successfully"));
});
exports.updateHandler = (0, asyncHandler_1.default)(async (req, res) => {
    const { username, email, phone } = req.body;
    const data = {};
    if (username)
        data.username = username;
    if (email)
        data.email = email;
    if (phone)
        data.phone = phone;
    if (Object.keys(data).length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one field is required",
        });
    }
    const updatedUser = await index_1.prisma.user.update({
        where: {
            id: req.user?.id,
        },
        data,
    });
    res.status(200).json({
        success: true,
        user: updatedUser,
    });
});
//# sourceMappingURL=auth.controller.js.map