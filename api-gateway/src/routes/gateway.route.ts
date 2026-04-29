import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICES } from "../config/service.config";
import { verifyToken } from "../middleware/logger.middleware";

const router = Router();

router.use(
  "/auth",
  createProxyMiddleware({
    target: SERVICES.AUTH,
    changeOrigin: true,
  })
);

router.use(
  "/commerce",
  verifyToken, 
  createProxyMiddleware({
    target: SERVICES.COMMERCE,
    changeOrigin: true,
  })
);

export default router;
