import {prisma} from '..';
import { notificationQueue } from '../queue/notification.queue';
import { orderQueue } from '../queue/order.queue';
import { client } from '../redis';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import asynchandler from '../utils/asyncHandler'


export const placeOrder = asynchandler(async (req, res) => {
  const { name, quantity } = req.body;
  const buyerId = req.user.id;

  if (!name || !quantity) {
    throw new ApiError(400, "Invalid input");
  }

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
  });

  if (!buyer) {
    throw new ApiError(404, "Buyer not found");
  }

  const order = await prisma.order.create({
    data: {
      buyerId,
      name,
      quantity,
      status: "pending",
    },
  });

  await orderQueue.add(
    "processOrder",
    {
      orderId: order.id,
      name,
      buyerId,
    },
    {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return res.status(201).json({
    message: "Order placed successfully",
    order,
  });
});


const confirmOrder = asynchandler(async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user?.id;
  const { acceptance } = req.body;

  if (!id) throw new ApiError(400, "Id is not found");

  if (!["Accepted", "Rejected"].includes(acceptance)) {
    throw new ApiError(400, "Invalid acceptance value");
  }

 if (acceptance === "Accepted") {
  const result = await prisma.order.updateMany({
    where: {
      id:Number(id),
      sellerId: null,
    },
    data: {
      sellerId,
      status: "accepted",
    },
  });

  if (result.count === 0) {
    throw new ApiError(400, "Order already accepted");
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: Number(id) },
  });
   if(!updatedOrder){
    throw new ApiError(404,"")
   }
  await notificationQueue.add("notifyBuyer", {
    type: "ORDER_ACCEPTED",
    userId: updatedOrder.buyerId,
    message: "Your order has been accepted ",
  });

  return res.status(200).json(
    new ApiResponse(200, updatedOrder, "Order accepted")
  );
}
}
)



const listOrders = asynchandler(async (req, res) => {
  const ownerId = req.user?.id;

  if (!ownerId) {
    throw new ApiError(404, "OwnerId not found");
  }

  const cursor = req.query.cursor
    ? Number(req.query.cursor)
    : undefined;

  const key = cursor
    ? `orders:${ownerId}:${cursor}`
    : `orders:${ownerId}:first`;

  const cachedData = await client.get(key);

  if (cachedData) {
    return res.status(200).json(
      new ApiResponse(200, JSON.parse(cachedData), "Fetched from cache")
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      sellerId: ownerId,
    },
    orderBy: {
      id: "desc",
    },
    take: 10,
  });

  const responseData = {
    orders,
    nextCursor: orders.length
      ? orders[orders.length - 1].id
      : null,
  };

  if (orders.length > 0) {
    await client.setex(key, 100, JSON.stringify(responseData));
  }

  return res.status(200).json(
    new ApiResponse(200, responseData, "Fetched orders successfully")
  );
});

const cancelOrder = asynchandler(async (req, res) => {
  const { orderId } = req.params;

  const id = Number(orderId);

  if (!id || isNaN(id)) {
    throw new ApiError(400, "Invalid Order ID");
  }

  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.buyerId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  if (order.status !== "pending") {
    throw new ApiError(409, "Order cannot be cancelled after processing");
  }

  const deletedOrder = await prisma.order.delete({
    where: { id }
  });

  return res.status(200).json(
    new ApiResponse(200, deletedOrder, "Order cancelled successfully")
  );
});
