import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 4000,

  AUTH_SERVICE:
    process.env.AUTH_SERVICE!,

  SHOP_SERVICE:
    process.env.SHOP_SERVICE!,

  MESSAGE_SERVICE:
    process.env.MESSAGE_SERVICE!,

  FRONTEND_URL:
    process.env.FRONTEND_URL!,
};