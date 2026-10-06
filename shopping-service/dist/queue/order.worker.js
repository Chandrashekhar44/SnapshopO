"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
const prisma_1 = __importDefault(require("../prisma"));
const notification_queue_1 = require("./notification.queue");
console.log("🔥 ORDER WORKER FILE LOADED");
console.log("ORDER WORKER PID", process.pid);
const worker = new bullmq_1.Worker("orderQueue", async (job) => {
    console.log("🔥 ORDER WORKER RECEIVED JOB:", job.id, job.data);
    const { orderId, name, buyerId, sellerId, } = job.data;
    if (!orderId || !buyerId || !name || !sellerId) {
        throw new Error("Invalid job data");
    }
    const buyer = await prisma_1.default.buyer.findUnique({
        where: {
            id: buyerId,
        },
    });
    if (!buyer) {
        throw new Error(`Buyer ${buyerId} not found`);
    }
    const seller = await prisma_1.default.seller.findUnique({
        where: {
            id: sellerId,
        },
        select: {
            id: true,
            userId: true,
        },
    });
    if (!seller) {
        throw new Error(`Seller ${sellerId} not found`);
    }
    // Create notification job
    const notificationJob = await notification_queue_1.notificationQueue.add("notification", {
        type: "ORDER",
        sellerUserId: seller.userId,
        orderId,
        productName: name,
    }, {
        jobId: `order-${orderId}`,
    });
    console.log("📨 ORDER NOTIFICATION JOB CREATED:", {
        jobId: notificationJob.id,
        orderId,
        sellerUserId: seller.userId,
    });
    console.log(`✅ Order ${orderId} processed`);
    return {
        orderId,
        sellerId: seller.id,
    };
}, {
    connection: redis_1.queueConnection,
    concurrency: 2,
});
worker.on("ready", () => {
    console.log("🟢 ORDER WORKER READY");
});
worker.on("completed", (job) => {
    console.log("✅ ORDER JOB COMPLETED:", job.id);
});
worker.on("failed", (job, error) => {
    console.error("❌ ORDER JOB FAILED:", job?.id, error);
});
worker.on("error", (error) => {
    console.error("❌ ORDER WORKER ERROR:", error);
});
exports.default = worker;
