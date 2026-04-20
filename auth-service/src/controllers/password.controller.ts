import { prisma } from "..";
import ApiError from "../utils/ApiError";
import asynchandler from "../utils/asyncHandler";


const verifyForgotPasswordOtp = asynchandler(async (req, res) => {
    const { otp, email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    if (!otp) {
        throw new ApiError(400, "OTP is required");
    }

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    if (!user.forgotOtp || !user.forgotOtpExpiry) {
        throw new ApiError(400, "OTP not generated");
    }
    if (user.forgotOtpExpiry < new Date()) {
        throw new ApiError(400, "OTP expired");
    }

    if (user.forgotOtp !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }
    await prisma.user.update({
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