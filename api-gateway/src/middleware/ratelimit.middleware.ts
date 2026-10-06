import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const limiter = rateLimit({
  windowMs:  60 * 10000, 

  max: 1000,

  message: {
    success: false,
    message: "Too many requests, try again later",
  },

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip!);
  },
});