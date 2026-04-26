import { Worker } from "bullmq";
import { getIO } from "./socket.js";
import { queueConnection } from "../redis.js"; 

const worker = new Worker(
  "notificationQueue",
  async (job) => {
    const { sellerId, orderId } = job.data;

    const io = getIO();

    io.to(`seller_${sellerId}`).emit("new-order", {
      orderId,
    });
  },
  {
    connection: queueConnection, 
  }
);
