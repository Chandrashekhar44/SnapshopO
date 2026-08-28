import { Request, Response, NextFunction } from "express";
import { client } from "../redis.js";

const WINDOW_SECONDS = 60;

const LIMITS = {
  GET: 60,
  POST: 20,
};

export const notificationRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const methodLimit =
      LIMITS[req.method as keyof typeof LIMITS];

    if (!methodLimit) {
      return next();
    }

    const key =
      `rate-limit:notifications:${req.method}:${userId}`;

    const currentCount = await client.incr(key);

    if (currentCount === 1) {
      await client.expire(
        key,
        WINDOW_SECONDS
      );
    }

    const ttl = await client.ttl(key);

    
    res.setHeader(
      "X-RateLimit-Limit",
      methodLimit
    );

    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(
        0,
        methodLimit - currentCount
      )
    );

    res.setHeader(
      "X-RateLimit-Reset",
      Math.max(0, ttl)
    );

    if (currentCount > methodLimit) {
      return res.status(429).json({
        success: false,
        message:
          "Too many notification requests. Please try again later.",
        retryAfter: Math.max(0, ttl),
      });
    }

    next();
  } catch (error) {
    console.error(
      "NOTIFICATION_RATE_LIMIT_ERROR",
      error
    );

   
    next();
  }
};
