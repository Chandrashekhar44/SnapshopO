"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordChange = exports.resendOtp = void 0;
const __1 = require("..");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const ApiResponse_1 = __importDefault(require("../utils/ApiResponse"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const verifyOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const { otp, email } = req.body;
    if (!email) {
        throw new ApiError_1.default(400, "Email is required");
    }
    if (!otp) {
        throw new ApiError_1.default(400, "OTP is required");
    }
    const user = await __1.prisma.user.findUnique({
        where: { email }
    });
    if (!user) {
        throw new ApiError_1.default(404, "User not found");
    }
    if (!user.forgotOtp || !user.forgotOtpExpiry) {
        throw new ApiError_1.default(400, "OTP not generated");
    }
    if (user.forgotOtpExpiry < new Date()) {
        throw new ApiError_1.default(400, "OTP expired");
    }
    const isValid = await bcryptjs_1.default.compare(user.forgotOtp, otp);
    if (!isValid) {
        throw new ApiError_1.default(400, "Invalid OTP");
    }
    await __1.prisma.user.update({
        where: { email },
        data: {
            forgotOtp: null,
            forgotOtpExpiry: null
        }
    });
    return res.status(200).json({
        success: true,
        message: "OTP verified successfully"
    });
});
exports.resendOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await __1.prisma.user.update({
        where: { email },
        data: {
            forgotOtp: await bcryptjs_1.default.hash(otp, 10),
            forgotOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        },
    });
    res.json({ message: "OTP resent" });
});
const sendOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError_1.default(404, 'Email not found');
    }
});
exports.passwordChange = (0, asyncHandler_1.default)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new ApiError_1.default(400, "Enter both current and new password");
    }
    const user = await __1.prisma.user.findUnique({
        where: {
            id: req.user?.id,
        },
    });
    if (!user) {
        throw new ApiError_1.default(404, "User not found");
    }
    const comparePass = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!comparePass) {
        throw new ApiError_1.default(400, "Current password is incorrect");
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await __1.prisma.user.update({
        where: {
            id: req.user?.id,
        },
        data: {
            password: hashedPassword,
        },
    });
    const responseData = {
        success: true,
        message: "Password updated successfully",
    };
    return res
        .status(200)
        .json(new ApiResponse_1.default(200, responseData, "Password updated successfully"));
});
//# sourceMappingURL=password.controller.js.map