import { Queue, Worker } from "bullmq";
import { queueConnection, client } from "../redis";
import { prisma } from "../index.js";
import { categorySorter } from "../categorysortingAi/ai.js";

const worker = new Worker(
  "orderQueue",
  async (job) => {
    const { orderId, name, buyerId } = job.data;

    if (!orderId || !buyerId || !name) {
      throw new Error("Invalid job data");
    }

    const buyer = await prisma.buyer.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) return;
    const cachedCategory = await client.get(`category:${name}`);

    let productCategory;

    if (cachedCategory) {
      productCategory = cachedCategory;
    } else {
      productCategory = await categorySorter(name);
      await client.setex(
        `category:${name}`,
        86400,
        String(productCategory)
      );
      
    }

    const sellers = await prisma.seller.findMany({
      where: {
        shopCategory: productCategory,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    const nearbySellers = sellers.filter((seller) => {
      const distance = Math.sqrt(
        Math.pow(seller.latitude - buyer.latitude, 2) +
        Math.pow(seller.longitude - buyer.longitude, 2)
      );

      return distance < 0.05;
    });

    const pipeline = client.pipeline();

const notificationQueue = new Queue("notificationQueue", {
  connection: queueConnection,
});

for (const seller of nearbySellers) {
  pipeline.del(`sellerOrders:${seller.id}`);

  await notificationQueue.add("new-order", {
    sellerId: seller.id,
    orderId,
  });
}

    await pipeline.exec();

    console.log(`Order ${orderId} processed`);
  },
  {
    connection: queueConnection,
    concurrency: 5,
  }
);

export default worker;
