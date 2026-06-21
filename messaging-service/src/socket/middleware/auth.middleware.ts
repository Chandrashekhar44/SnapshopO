import { prisma } from "../../prisma/client";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import asynchandler from "../../utils/asyncHandler";
import ApiError from "../../utils/ApiError";


interface JwtPayloadType {
  id: number;
}

export const authMiddleware = asynchandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Access token missing");
  }

  let decodedToken: JwtPayloadType;

  try {
    decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JwtPayloadType;

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
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;
  next();
});