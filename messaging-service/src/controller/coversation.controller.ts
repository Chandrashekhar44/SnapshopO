import { Request, Response } from "express";
import {prisma} from "../prisma/client";

export const getSellerThreads = async (
  req: Request,
  res: Response
) => {

  try {

    const sellerId =
      Number(req.params.sellerId);

    const conversations =
      await prisma.conversation.findMany({
        where: {
          sellerId,
        },

        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    return res.json(conversations);

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message:
        "Failed to fetch conversations",
    });

  }
};