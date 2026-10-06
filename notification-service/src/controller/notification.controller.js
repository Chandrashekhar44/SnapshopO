import { z } from "zod";
import { prisma } from "../prisma.js";
import { client } from "../redis.js";
import { emitNotification } from "../socket/emitter.js";
import ApiError from "../utils/ApiError.js";
import asynchandler from "../utils/asyncHandler.js";
const createNotificationSchema = z.object({
    userId: z.number(),
    type: z.enum(["ORDER", "REQUEST"]),
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(500),
    entityId: z.string(),
    entityType: z.string().max(50),
    actionUrl: z.string().max(500),
    idempotencyKey: z.string().min(10).max(100),
});
const getNotificationsSchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20),
    cursor: z.string().optional(),
});
const getNotificationId = (req) => {
    const notificationId = req.params.notificationId;
    if (typeof notificationId !== "string" ||
        notificationId.length === 0) {
        return null;
    }
    return notificationId;
};
const invalidateNotificationCache = async (userId) => {
    await client.del(`notifications:${userId}:7d`);
};
export const getNotificationStatus = asynchandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const token = await prisma.deviceToken.findFirst({
            where: {
                userId
            }
        });
        return res.json({
            enabled: Boolean(token)
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            enabled: false
        });
    }
});
export const createNotification = asynchandler(async (req, res) => {
    try {
        const parsed = createNotificationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification data",
                errors: parsed.error.flatten(),
            });
        }
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { userId, type, title, description, entityId, entityType, actionUrl, idempotencyKey, } = parsed.data;
        const idempotencyRedisKey = `notification:idempotency:${userId}:${idempotencyKey}`;
        const existing = await client.get(idempotencyRedisKey);
        if (existing) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                data: JSON.parse(existing),
            });
        }
        const targetUser = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
            },
        });
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Target user not found",
            });
        }
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                description,
                entityId,
                entityType,
                actionUrl,
            },
        });
        await client.set(idempotencyRedisKey, JSON.stringify(notification), "EX", 60 * 60);
        await invalidateNotificationCache(userId);
        emitNotification(userId, notification);
        return res.status(201).json({
            success: true,
            duplicate: false,
            data: notification,
        });
    }
    catch (error) {
        console.error("CREATE_NOTIFICATION_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create notification",
        });
    }
});
export const getNotifications = async (req, res) => {
    console.log("111");
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        console.log("222");
        const parsed = getNotificationsSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: parsed.error.flatten(),
            });
        }
        console.log("3333");
        const { limit, cursor, } = parsed.data;
        // Directly use authenticated user's id
        const userId = req.user.id;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        console.log("========== GET NOTIFICATIONS ==========");
        console.log("Authenticated user:", userId);
        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
            orderBy: [
                {
                    createdAt: "desc",
                },
                {
                    id: "desc",
                },
            ],
            take: limit + 1,
            ...(cursor
                ? {
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                }
                : {}),
        });
        console.log("Notifications from PostgreSQL:", notifications);
        const hasMore = notifications.length > limit;
        const results = hasMore
            ? notifications.slice(0, limit)
            : notifications;
        const nextCursor = hasMore
            ? results[results.length - 1].id
            : null;
        return res.status(200).json({
            success: true,
            source: "database",
            data: {
                notifications: results,
                pagination: {
                    limit,
                    hasMore,
                    nextCursor,
                },
            },
        });
    }
    catch (error) {
        console.error("GET_NOTIFICATIONS_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
        });
    }
};
export const markNotificationAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const notificationId = getNotificationId(req);
        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID",
            });
        }
        const userId = req.user.id;
        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        if (notification.isRead) {
            return res.status(200).json({
                success: true,
                message: "Notification already marked as read",
                data: notification,
            });
        }
        const updatedNotification = await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                isRead: true,
            },
        });
        await invalidateNotificationCache(userId);
        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: updatedNotification,
        });
    }
    catch (error) {
        console.error("MARK_NOTIFICATION_READ_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
        });
    }
};
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const sellerId = req.user.id;
        const user = await prisma.seller.findFirst({
            where: {
                userId: sellerId
            }
        });
        const userId = user?.id;
        if (!userId) {
            throw new ApiError(400, "UserId not found");
        }
        const result = await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        await invalidateNotificationCache(userId);
        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            count: result.count,
        });
    }
    catch (error) {
        console.error("MARK_ALL_NOTIFICATIONS_READ_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
        });
    }
};
export const deleteNotification = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const notificationId = getNotificationId(req);
        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID",
            });
        }
        const userId = req.user.id;
        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        await prisma.notification.delete({
            where: {
                id: notificationId,
            },
        });
        await invalidateNotificationCache(userId);
        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    }
    catch (error) {
        console.error("DELETE_NOTIFICATION_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete notification",
        });
    }
};
export const deleteAllNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const userId = req.user.id;
        const result = await prisma.notification.deleteMany({
            where: {
                userId,
            },
        });
        await invalidateNotificationCache(userId);
        return res.status(200).json({
            success: true,
            message: "All notifications deleted successfully",
            count: result.count,
        });
    }
    catch (error) {
        console.error("DELETE_ALL_NOTIFICATIONS_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete all notifications",
        });
    }
};
export const acceptNotificationRequest = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { notificationId } = req.params;
        if (Array.isArray(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification id",
            });
        }
        const notification = await prisma.notification.findUnique({
            where: {
                id: notificationId,
            },
        });
        if (!notification) {
            return res.status(400).json({
                success: false,
                message: "Notification not found",
            });
        }
        console.log("entityId:", notification.entityId, "type:", typeof notification.entityId);
        const seller = await prisma.seller.findUnique({
            where: {
                userId: notification.userId,
            },
        });
        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "Cannot find seller",
            });
        }
        if (seller.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }
        if (notification.type !== "REQUEST") {
            return res.status(400).json({
                success: false,
                message: "Only request notifications can be accepted",
            });
        }
        if (notification.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Request already processed",
            });
        }
        if (!notification.entityId) {
            return res.status(400).json({
                success: false,
                message: "Invalid buyer reference",
            });
        }
        const buyer = await prisma.buyer.findUnique({
            where: { id: Number(notification.entityId) }, // not userId
        });
        if (!buyer) {
            return res.status(400).json({
                success: false,
                message: "Buyer not found",
            });
        }
        const requestId = notification.requestId;
        if (!requestId) {
            throw new ApiError(400, "Request ID of notification is missing");
        }
        const result = await prisma.$transaction(async (tx) => {
            const acceptedRequest = await tx.request.updateMany({
                where: {
                    id: requestId,
                    status: "PENDING"
                },
                data: {
                    status: "ACCEPTED",
                    acceptedSellerId: seller.id
                }
            });
            if (acceptedRequest.count === 0) {
                throw new Error("Request already accepted by another seller");
            }
            const request = await tx.request.findUnique({
                where: {
                    id: requestId
                }
            });
            if (!request) {
                throw new Error("Request not found");
            }
            const updatedNotification = await tx.notification.update({
                where: {
                    id: notificationId
                },
                data: {
                    status: "ACCEPTED",
                    isRead: true,
                    readAt: new Date()
                }
            });
            const order = await tx.order.create({
                data: {
                    name: request.productName,
                    quantity: 1,
                    status: "ACCEPTED",
                    price: 100,
                    buyerId: request.buyerId,
                    sellerId: seller.id,
                    requestId: request.id
                }
            });
            await tx.notification.updateMany({
                where: {
                    entityId: String(request.id),
                    type: "REQUEST",
                    status: "PENDING",
                    id: {
                        not: notificationId
                    }
                },
                data: {
                    status: "DECLINED",
                    isRead: true,
                    readAt: new Date()
                }
            });
            return {
                updatedNotification,
                order
            };
        });
        return res.json({
            success: true,
            message: "Request accepted",
            notification: result.updatedNotification,
            order: result.order,
        });
    }
    catch (error) {
        console.error("ACCEPT REQUEST ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to accept request",
        });
    }
};
export const declineNotificationRequest = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { notificationId } = req.params;
        if (Array.isArray(notificationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification id",
            });
        }
        const notification = await prisma.notification.findUnique({
            where: {
                id: notificationId,
            },
        });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        const slug = await prisma.seller.findFirst({
            where: {
                userId: notification.userId
            }
        });
        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Cannot find the seller"
            });
        }
        if (slug.userId != req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }
        if (notification.type !== "REQUEST") {
            return res.status(400).json({
                success: false,
                message: "Only request notifications can be declined",
            });
        }
        const updated = await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                status: "DECLINED",
                isRead: true,
                readAt: new Date(),
            },
        });
        return res.json({
            success: true,
            message: "Request declined",
            notification: updated,
        });
    }
    catch (error) {
        console.error("DECLINE_NOTIFICATION_ERROR", error);
        return res.status(500).json({
            success: false,
            message: "Failed to decline request",
        });
    }
};
export const accepts = asynchandler(async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { notificationId } = req.params;
        if (Array.isArray(notificationId)) {
            return res.status(402).json({
                success: false,
                message: "Invalid notification id",
            });
        }
        const notification = await prisma.notification.findUnique({
            where: {
                id: notificationId,
            },
        });
        if (!notification) {
            return res.status(403).json({
                success: false,
                message: "Notification not found",
            });
        }
        console.log("entityId:", notification.entityId, "type:", typeof notification.entityId);
        const seller = await prisma.seller.findUnique({
            where: {
                userId: notification.userId,
            },
        });
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Cannot find seller",
            });
        }
        if (seller.userId !== req.user.id) {
            return res.status(405).json({
                success: false,
                message: "Forbidden",
            });
        }
        if (notification.type !== "REQUEST") {
            return res.status(406).json({
                success: false,
                message: "Only request notifications can be accepted",
            });
        }
        if (notification.status !== "PENDING") {
            return res.status(407).json({
                success: false,
                message: "Request already processed",
            });
        }
        const requestId = notification.requestId;
        console.log("rmn", requestId);
        if (!requestId) {
            throw new ApiError(411, "Request ID of notification is missing");
        }
        const result = await prisma.$transaction(async (tx) => {
            const acceptedRequest = await tx.request.updateMany({
                where: {
                    id: requestId,
                    status: "PENDING",
                },
                data: {
                    status: "ACCEPTED",
                    acceptedSellerId: seller.id,
                },
            });
            if (acceptedRequest.count === 0) {
                throw new Error("Request already accepted by another seller");
            }
            const request = await tx.request.findUnique({
                where: {
                    id: requestId,
                },
                include: {
                    buyer: true,
                    acceptedSeller: true,
                },
            });
            if (!request) {
                throw new Error("Request not found");
            }
            if (!request.acceptedSeller) {
                throw new Error("Accepted seller not found");
            }
            const updatedNotification = await tx.notification.update({
                where: {
                    id: notificationId,
                },
                data: {
                    status: "ACCEPTED",
                    isRead: true,
                    readAt: new Date(),
                },
            });
            const order = await tx.order.create({
                data: {
                    name: request.productName,
                    quantity: 1,
                    status: "ACCEPTED",
                    price: 100,
                    buyerId: request.buyerId,
                    sellerId: seller.id,
                    requestId: request.id,
                },
            });
            await tx.notification.updateMany({
                where: {
                    requestId: request.id,
                    type: "REQUEST",
                    status: "PENDING",
                    id: {
                        not: notificationId,
                    },
                },
                data: {
                    status: "DECLINED",
                    isRead: true,
                    readAt: new Date(),
                },
            });
            return {
                updatedNotification,
                order,
                // IMPORTANT: these are User IDs
                buyerUserId: request.buyer.userId,
                sellerUserId: request.acceptedSeller.userId,
            };
        });
        return res.json({
            success: true,
            message: "Request accepted",
            notification: result.updatedNotification,
            order: result.order,
            buyerUserId: result.buyerUserId,
            sellerUserId: result.sellerUserId,
        });
    }
    catch (error) {
        console.error("ACCEPT REQUEST ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to accept request",
        });
    }
});
