import { prisma } from "..";
import ApiError from "../utils/ApiError";
import asynchandler from "../utils/asyncHandler";
import bcrypt from 'bcryptjs'


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
     boolean otp  =bcrypt.compare(user.forgotOtp,otp);

    if (OTP) {
        throw new ApiError(400, "Invalid OTP");
    }
    await prisma.user.update({
        where: { email },
        data: {
            forgotOtp: bcrypt.hash(otp,10),
            forgotOtpExpiry: null
        }
    });

    return res.status(200).json({
        success: true,
        message: "OTP verified successfully"
    });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.update({
    where: { email },
    data: {
      forgotOtp: otp,
      forgotOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendOtpEmail(email, otp);

  res.json({ message: "OTP resent" });
});


export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
