"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = void 0;
const client_1 = require("../prisma/client");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiResponse_1 = __importDefault(require("../utils/ApiResponse"));
exports.searchUsers = (0, asyncHandler_1.default)(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    if (!search) {
        throw new ApiError_1.default(400, "Search query is required");
    }
    const skip = (page - 1) * limit;
    const users = await client_1.prisma.user.findMany({
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
    const totalUsers = await client_1.prisma.user.count({
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
    return res.status(200).json(new ApiResponse_1.default(200, {
        users,
        pagination: {
            total: totalUsers,
            page,
            limit,
            totalPages: Math.ceil(totalUsers / limit),
        },
    }, "Users fetched successfully"));
});
