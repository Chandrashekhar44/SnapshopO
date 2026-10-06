import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asynchandler from "../utils/asyncHandler.js";
export const authMiddleware = asynchandler(async (req, res, next) => {
    console.log("========== NOTIFICATION AUTH ==========");
    console.log("Cookie header:", req.headers.cookie);
    console.log("Cookies:", req.cookies);
    console.log("Authorization:", req.header("Authorization"));
    const token = req.cookies?.accessToken ||
        req
            .header("Authorization")
            ?.replace("Bearer ", "");
    if (!token) {
        console.log("❌ NO ACCESS TOKEN");
        throw new ApiError(401, "Access token missing");
    }
    console.log("✅ ACCESS TOKEN FOUND");
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("✅ TOKEN DECODED:", decodedToken);
    }
    catch (error) {
        console.log("❌ JWT ERROR:", error?.name, error?.message);
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
        console.log("❌ USER NOT FOUND:", decodedToken.id);
        throw new ApiError(401, "User not found");
    }
    console.log("✅ AUTHENTICATED USER:", user.id);
    req.user = user;
    next();
});
