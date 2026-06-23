import { Router } from "express";
import { createServiceProxy } from "../utils/proxy.utils";
import { env } from "../config/service.config";
import { createSocketProxy } from "../utils/socketProxy.utils";

const router = Router();

router.use(
  "/api/auth",
  createServiceProxy(
    env.AUTH_SERVICE,
    "/api/auth"
  )
);

router.use(
  "/api/products",
  createServiceProxy(
    env.SHOP_SERVICE,
    "/api/products"
  )
);

router.use(
  "/api/messages",
  createServiceProxy(
    env.MESSAGE_SERVICE,
    "/api/messages"
  )
);

router.use(
  "/socket.io",
  createSocketProxy(env.MESSAGE_SERVICE)
);

export default router;