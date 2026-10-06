import { Request, Response } from "express";
import prisma from "../prisma";
import {client} from "../redis";
import asynchandler from "../utils/asyncHandler";
import { tryCatch } from "bullmq";
import ApiError from "../utils/ApiError";


export const getSellerDashboardStats = async (
  req: Request,
  res: Response
) => {

  try {

    const userId = req.user.id;


    const seller = await prisma.seller.findUnique({
      where:{
        userId:userId
      }
    });


    if(!seller){
      return res.status(404).json({
        message:"Seller not found"
      });
    }


    const cacheKey = `seller:stats:${seller.id}`;

    const cachedStats = await client.get(cacheKey);


    if(cachedStats){

      console.log("Returning dashboard stats from Redis");

      return res.status(200).json(
        JSON.parse(cachedStats)
      );

    }



    console.log("Fetching dashboard stats from DB");



    const completedOrderData = await prisma.order.findMany({

      where:{
        sellerId:seller.id,
        status:"COMPLETED"
      },

      select:{
        price:true,
        quantity:true
      }

    });



    const totalRevenue = completedOrderData.reduce(
      (sum,order)=> 
        sum + (order.price ?? 0) * order.quantity,
      0
    );



    const newOrders = await prisma.order.count({

      where:{
        sellerId:seller.id,
        status:"ACCEPTED"
      }

    });



    const activeListings = await prisma.order.count({

      where:{
        sellerId:seller.id,
        status:{
          in:[
            "PENDING",
            "ACCEPTED",
            "PACKED",
            "SHIPPED"
          ]
        }
      }

    });



    const completedOrders = await prisma.order.count({

      where:{
        sellerId:seller.id,
        status:"COMPLETED"
      }

    });



    const stats = {

      totalRevenue,

      activeListings,

      newOrders,

      completedOrders

    };
    await client.set(
      cacheKey,
      JSON.stringify(stats),
      "EX",
      300
    );



    return res.status(200).json(stats);



  } catch(error){

    console.error(
      "Seller dashboard stats error:",
      error
    );


    return res.status(500).json({
      message:"Internal server error"
    });

  }

};

export const fulfillOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const seller = await prisma.seller.findUnique({
      where: {
        userId,
      },
    });

    if (!seller) {
      return res.status(404).json({
        message: "Seller not found",
      });
    }

    console.log("User ID:", userId);
    console.log("Seller ID:", seller.id);

    const pending = await prisma.order.findMany({
      where: {
        sellerId: seller.id,
        status: "ACCEPTED",
      },
      include: {
        Buyer: {
          include: {
            User: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    console.log("Orders:", pending);

    return res.status(200).json(pending);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const completedOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      throw new ApiError(400, "UserId not found");
    }

    const seller = await prisma.seller.findUnique({
      where: {
        userId,
      },
    });

    if (!seller) {
      throw new ApiError(404, "Seller not found");
    }

    const completed = await prisma.order.findMany({
      where: {
        sellerId: seller.id,
        status: "COMPLETED",
      },
      include: {
        Buyer: {
          include: {
            User: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(completed);

  } catch (error) {
    console.error("COMPLETED ORDERS ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};