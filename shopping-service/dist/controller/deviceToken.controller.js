"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDeviceToken = void 0;
const __1 = require("..");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
exports.saveDeviceToken = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }
        const userId = req.user.id;
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                message: "Device token is required"
            });
        }
        const deviceToken = await __1.prisma.deviceToken.upsert({
            where: {
                token
            },
            update: {
                userId
            },
            create: {
                token,
                userId
            }
        });
        return res.status(200).json({
            success: true,
            message: "Device token saved",
            deviceToken
        });
    }
    catch (error) {
        console.error("Save device token error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
