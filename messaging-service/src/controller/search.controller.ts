import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import ApiError from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse";

export const searchUsers = asyncHandler(
  async (req: Request, res: Response) => {

    const search = String(req.query.search || "").trim();

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (!search) {
      throw new ApiError(
        400,
        "Search query is required"
      );
    }

    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },

          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },

      skip,
      take: limit,

      orderBy: {
        createdAt: "desc",
      },
    });

    const totalUsers = await prisma.user.count({
      where: {
        OR: [
          {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },

          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          users,
          pagination: {
            total: totalUsers,
            page,
            limit,
            totalPages: Math.ceil(
              totalUsers / limit
            ),
          },
        },
        "Users fetched successfully"
      )
    );
  }
);