import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asynchandler from "../utils/asyncHandler.js";
export const authMiddleware = asynchandler(async (req, res, next) => {
 
    const token = req.cookies?.accessToken ||
        req
            .header("Authorization")
            ?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(401, "Access token missing");
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("✅ TOKEN DECODED:", decodedToken);
    }
    catch (error) {
        if (error?.name === "TokenExpiredError") {
            throw new ApiError(401, "Access token expired");
        }
        if (error?.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid access token");
        }
        throw new ApiError(401, "Unauthorized token error");
    }
    const user = await prisma.user.findUnique({
        where: {
            id: decodedToken.id,
        },
    });
    if (!user) {
        throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
});
