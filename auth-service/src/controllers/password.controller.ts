import { prisma } from "..";
import { client } from "../config/redis.config";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import asynchandler from "../utils/asyncHandler";
import bcrypt from 'bcryptjs'


const verifyOtp = asynchandler(async (req, res) => {
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
    const isValid  =await bcrypt.compare(user.forgotOtp,otp);

    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }
    await prisma.user.update({
        where: { email },
        data: {
            forgotOtp:null,
            forgotOtpExpiry: null
        }
    });

    return res.status(200).json({
        success: true,
        message: "OTP verified successfully"
    });
});

export const resendOtp = asynchandler(async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.update({
    where: { email },
    data: {
      forgotOtp:await bcrypt.hash(otp,10),
      forgotOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendOtpEmail(email, otp);

  res.json({ message: "OTP resent" });
});

const sendOtp = asynchandler(async(req,res)=>{
    const { email} = req.body;

    if(!email){
        throw new ApiError(404,'Email not found')
    }

    const otp = await axios.post()


})



export const passwordChange = asynchandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Enter both current and new password");
  }

 

  const user = await prisma.user.findUnique({
    where: {
      id: req.user?.id,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const comparePass = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!comparePass) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
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
    .json(
      new ApiResponse(
        200,
        responseData,
        "Password updated successfully"
      )
    );
});