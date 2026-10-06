"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completedOrders = exports.fulfillOrders = exports.getSellerDashboardStats = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const redis_1 = require("../redis");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const getSellerDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const seller = await prisma_1.default.seller.findUnique({
            where: {
                userId: userId
            }
        });
        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }
        const cacheKey = `seller:stats:${seller.id}`;
        const cachedStats = await redis_1.client.get(cacheKey);
        if (cachedStats) {
            console.log("Returning dashboard stats from Redis");
            return res.status(200).json(JSON.parse(cachedStats));
        }
        console.log("Fetching dashboard stats from DB");
        const completedOrderData = await prisma_1.default.order.findMany({
            where: {
                sellerId: seller.id,
                status: "COMPLETED"
            },
            select: {
                price: true,
                quantity: true
            }
        });
        const totalRevenue = completedOrderData.reduce((sum, order) => sum + (order.price ?? 0) * order.quantity, 0);
        const newOrders = await prisma_1.default.order.count({
            where: {
                sellerId: seller.id,
                status: "ACCEPTED"
            }
        });
        const activeListings = await prisma_1.default.order.count({
            where: {
                sellerId: seller.id,
                status: {
                    in: [
                        "PENDING",
                        "ACCEPTED",
                        "PACKED",
                        "SHIPPED"
                    ]
                }
            }
        });
        const completedOrders = await prisma_1.default.order.count({
            where: {
                sellerId: seller.id,
                status: "COMPLETED"
            }
        });
        const stats = {
            totalRevenue,
            activeListings,
            newOrders,
            completedOrders
        };
        await redis_1.client.set(cacheKey, JSON.stringify(stats), "EX", 300);
        return res.status(200).json(stats);
    }
    catch (error) {
        console.error("Seller dashboard stats error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
exports.getSellerDashboardStats = getSellerDashboardStats;
const fulfillOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const seller = await prisma_1.default.seller.findUnique({
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
        const pending = await prisma_1.default.order.findMany({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.fulfillOrders = fulfillOrders;
const completedOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            throw new ApiError_1.default(400, "UserId not found");
        }
        const seller = await prisma_1.default.seller.findUnique({
            where: {
                userId,
            },
        });
        if (!seller) {
            throw new ApiError_1.default(404, "Seller not found");
        }
        const completed = await prisma_1.default.order.findMany({
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
    }
    catch (error) {
        console.error("COMPLETED ORDERS ERROR:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.completedOrders = completedOrders;
