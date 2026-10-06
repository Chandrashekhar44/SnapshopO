import { Router } from "express";

import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  declineNotificationRequest,
  getNotificationStatus,
  acceptNotificationRequest,
  accepts,
} from "../controller/notification.controller.js";

import { authMiddleware } from "../middleware/requireTenantAuth.js";
import { notificationRateLimiter } from "../middleware/notificationRateLimiter.js";

const router = Router();


router.post(
  "/",
  authMiddleware,
  notificationRateLimiter,
  createNotification
);


router.get(
  "/",
  authMiddleware,
  notificationRateLimiter,
  getNotifications
);


router.patch(
  "/read-all",
  authMiddleware,
  notificationRateLimiter,
  markAllNotificationsAsRead
);


router.patch(
  "/:notificationId/read",
  authMiddleware,
  notificationRateLimiter,
  markNotificationAsRead
);


router.patch(
  "/:notificationId/accept",
  authMiddleware,
  notificationRateLimiter,
  acceptNotificationRequest
);


router.patch(
  "/:notificationId/decline",
  authMiddleware,
  notificationRateLimiter,
  declineNotificationRequest
);

router.get("/status",
  authMiddleware,
  notificationRateLimiter,
  getNotificationStatus
)

router.patch("/:notificationId/accepts",authMiddleware,
  notificationRateLimiter,accepts);


export default router;