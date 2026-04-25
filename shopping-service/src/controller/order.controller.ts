import {prisma} from '..';
import { orderQueue } from '../queue/order.queue';
import ApiError from '../utils/ApiError';
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