import { prisma } from "../index";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import asynchandler from "../utils/asyncHandler";

interface JwtPayloadType {
  id: number;
}

export const authMiddleware = asynchandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
    console.log("req.cookies",req.cookies)
    console.log("req.cookies.accesstoken",req.cookies.accessToken)

  if (!token) {
    throw new ApiError(401, "Access token missing");
  }

  console.log("token",token)

  let decodedToken: JwtPayloadType;

  try {
    decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JwtPayloadType;
    console.log("decoded" ,decodedToken)

  } catch (err) {

    if (err instanceof TokenExpiredError) {
      throw new ApiError(401, "Access token expired");
    }

    if (err instanceof JsonWebTokenError) {
      throw new ApiError(401, "Invalid access token");
    }

    throw new ApiError(401, "Unauthorized token error");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    }
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;
  next();
});