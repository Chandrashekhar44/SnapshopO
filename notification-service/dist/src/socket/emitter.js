// src/socket/emitter.ts
import { Worker } from "bullmq";
import { getIO } from "./socket.js";
import { queueConnection, client, } from "../redis.js";
import { publishNotification, } from "../config/publisher.js";
import { prisma } from "../prisma.js";
export const emitNotification = (userId, notification) => {
    const io = getIO();
    io.to(`user_${userId}`).emit("notification", notification);
};
const worker = new Worker("notificationQueue", async (job) => {
    console.log("Job received:", job.name, job.data);
    const { sellerId } = job.data;
    if (!sellerId) {
        throw new Error("Seller ID missing");
    }
    const connectionCount = await client.scard(`seller:${sellerId}:connections`);
    const online = connectionCount > 0;
    if (online) {
        const io = getIO();
        switch (job.name) {
            case "new-order": {
                const { orderId } = job.data;
                io.to(`seller_${sellerId}`).emit("new-order", {
                    orderId,
                });
                break;
            }
            case "buyer-demand": {
                const { productName, category, } = job.data;
                console.log("Sending demand to seller room:", `seller_${sellerId}`);
                io.to(`seller_${sellerId}`).emit("buyer-demand", {
                    productName,
                    category,
                });
                break;
            }
        }
    }
    else {
        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId,
            },
            select: {
                User: {
                    select: {
                        deviceTokens: true,
                    },
                },
            },
        });
        if (!seller)
            return;
        const deviceTokens = seller.User.deviceTokens;
        if (!deviceTokens || deviceTokens.length === 0) {
            return;
        }
        for (const deviceToken of deviceTokens) {
            await publishNotification({
                type: "fcm",
                to: deviceToken.token,
                message: `Buyer needs ${job.data.productName}`,
            });
        }
        ;
    }
}, {
    connection: queueConnection,
    concurrency: 10,
});
export default worker;
