import { Worker } from "bullmq";
import { queueConnection } from "../redis.js";
import { prisma } from "../prisma.js";
import { emitNotification } from "../socket/emitter.js";

console.log("🔥 Notification Worker Started", process.pid);

const notificationWorker = new Worker(
  "notificationQueue",

  async (job) => {
    console.log("NOTIFICATION WORKER PID", process.pid);

    console.log("🔥 PROCESSING JOB", {
      id: job.id,
      name: job.name,
      data: job.data,
    });

    const {
      requestId,
      type,
      sellerUserId,
      sellerUserIds,
      buyerId,
      productName,
      category,
      orderId,
    } = job.data;

    const sellersToNotify: number[] =
      Array.isArray(sellerUserIds) && sellerUserIds.length > 0
        ? [...new Set(sellerUserIds)]
        : sellerUserId !== undefined
        ? [sellerUserId]
        : [];

    if (sellersToNotify.length === 0) {
      throw new Error("No seller user IDs provided");
    }

    /*
    ========================================
    REQUEST NOTIFICATION
    ========================================
    */

    if (type === "REQUEST") {
      if (!buyerId || !productName || !category) {
        throw new Error("Invalid REQUEST data");
      }

      const notifications = [];

      for (const userId of sellersToNotify) {
        console.log(
          "📌 Creating REQUEST notification for seller:",
          userId
        );

       const notification = await prisma.notification.upsert({
  where: {
    entityId_entityType_userId: {
      entityId: String(requestId),
      entityType: "REQUEST",
      userId,
    },
  },

  update: {},

  create: {
    userId,

    type: "REQUEST",

    title: "New Buyer Request",

    description:
      `${productName} requested in ${category}`,

    entityId: String(requestId),

    entityType: "REQUEST",

    actionUrl: "/buyer-requests",

    requestId: Number(requestId),
  },
});

        console.log(
          "✅ DB NOTIFICATION CREATED",
          {
            id: notification.id,
            userId: notification.userId,
          }
        );

        try {
          emitNotification(
            userId,
            notification
          );

          console.log(
            "✅ SOCKET SENT",
            userId
          );
        } catch (error) {
          console.log(
            "❌ SOCKET ERROR",
            userId,
            error
          );
        }

        notifications.push(notification);
      }

      console.log(
        `🎉 REQUEST notifications processed for ${sellersToNotify.length} seller(s)`
      );

      return notifications;
    }

    /*
    ========================================
    ORDER NOTIFICATION
    ========================================
    */

    if (type === "ORDER") {
      if (!productName || !orderId) {
        throw new Error("Invalid ORDER data");
      }

      const notifications = [];

      for (const userId of sellersToNotify) {
        console.log(
          "📌 Creating ORDER notification for seller:",
          userId
        );

        const notification =
          await prisma.notification.upsert({
            where: {
              entityId_entityType_userId: {
                entityId: String(orderId),
                entityType: "ORDER",
                userId,
              },
            },

            update: {},

            create: {
              userId,
              type: "ORDER",
              title: productName,
              description:
                `New order received: ${productName}`,
              entityId: String(orderId),
              entityType: "ORDER",
              actionUrl: `/orders/${orderId}`,
            },
          });

        console.log(
          "✅ DB NOTIFICATION CREATED",
          {
            id: notification.id,
            userId: notification.userId,
          }
        );

        try {
          emitNotification(
            userId,
            notification
          );

          console.log(
            "✅ SOCKET SENT",
            userId
          );
        } catch (error) {
          console.log(
            "❌ SOCKET ERROR",
            userId,
            error
          );
        }

        notifications.push(notification);
      }

      console.log(
        `🎉 ORDER notifications processed for ${sellersToNotify.length} seller(s)`
      );

      return notifications;
    }

    throw new Error(
      `Unknown notification type: ${type}`
    );
  },

  {
    connection: queueConnection,
    concurrency: 2,
  }
);

notificationWorker.on(
  "completed",
  (job) => {
    console.log(
      "🎉 COMPLETED",
      {
        id: job.id,
        data: job.data,
      }
    );
  }
);

notificationWorker.on(
  "failed",
  (job, error) => {
    console.log(
      "❌ FAILED",
      {
        id: job?.id,
        data: job?.data,
        error: error.message,
      }
    );
  }
);

export default notificationWorker;