"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.listOrders = exports.confirmOrder = exports.placeOrder = exports.getProduct = exports.searchProduct = exports.search = void 0;
const __1 = require("..");
const notification_queue_1 = require("../queue/notification.queue");
const order_queue_1 = require("../queue/order.queue");
const redis_1 = require("../redis");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const ApiResponse_1 = __importDefault(require("../utils/ApiResponse"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const client_1 = require("@prisma/client");
const tokenizer_1 = require("../search-service/tokenizer");
const demand_queue_1 = require("../queue/demand.queue");
const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
exports.search = (0, asyncHandler_1.default)(async (req, res) => {
    const { query, page = 1, limit = 20, category, minPrice, maxPrice, sort = "relevance", } = req.query;
    if (!query || typeof query !== "string") {
        throw new ApiError_1.default(400, "Search query is required");
    }
    console.log("backend");
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const words = query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const whereCondition = {
        OR: words.map((word) => ({
            OR: [
                {
                    name: {
                        contains: word,
                        mode: "insensitive"
                    }
                },
                {
                    category: {
                        contains: word,
                        mode: "insensitive"
                    }
                }
            ]
        }))
    };
    if (category) {
        whereCondition.category = {
            equals: category,
            mode: "insensitive",
        };
    }
    if (minPrice || maxPrice) {
        whereCondition.price = {};
        if (minPrice) {
            whereCondition.price.gte = Number(minPrice);
        }
        if (maxPrice) {
            whereCondition.price.lte = Number(maxPrice);
        }
    }
    let orderBy = {
        createdAt: "desc"
    };
    if (sort === "price-low") {
        orderBy = {
            price: "asc"
        };
    }
    if (sort === "price-high") {
        orderBy = {
            price: "desc"
        };
    }
    const [products, total] = await Promise.all([
        __1.prisma.product.findMany({
            where: whereCondition,
            skip,
            take: limitNumber,
            orderBy,
            select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: true,
                createdAt: true,
                Seller: {
                    select: {
                        id: true,
                        shopName: true,
                        shopAddress: true,
                        shopCategory: true,
                        latitude: true,
                        longitude: true,
                    }
                }
            }
        }),
        __1.prisma.product.count({
            where: whereCondition
        })
    ]);
    if (products.length === 0) {
        throw new ApiError_1.default(404, "No products found");
    }
    return res.status(200).json({
        success: true,
        data: products,
        pagination: {
            totalProducts: total,
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            hasNextPage: pageNumber < Math.ceil(total / limitNumber)
        }
    });
});
exports.searchProduct = (0, asyncHandler_1.default)(async (req, res) => {
    const { query, category } = req.query;
    const userId = req.user.id;
    const buyer = await __1.prisma.buyer.findUnique({
        where: {
            userId
        }
    });
    if (!buyer) {
        throw new ApiError_1.default(404, "Buyer profile not found");
    }
    const buyerId = buyer.id;
    const limit = 50;
    const radius = 5;
    if (!query || typeof query !== "string") {
        throw new ApiError_1.default(400, "Query parameter is required");
    }
    const latitude = req.user?.latitude;
    const longitude = req.user?.longitude;
    if (latitude == null || longitude == null) {
        throw new ApiError_1.default(400, "User location is not set");
    }
    const searchRadiusKm = Math.min(Number(radius) || DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
    const searchRadiusMeters = searchRadiusKm * 1000;
    const resultLimit = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const words = (0, tokenizer_1.tokenize)(query);
    if (words.length === 0) {
        return res.json([]);
    }
    console.log("words", words);
    const matches = await __1.prisma.searchIndex.groupBy({
        by: ["productId"],
        where: { keyword: { in: words } },
        _count: { keyword: true },
    });
    if (matches.length === 0) {
        const request = await __1.prisma.request.create({
            data: {
                buyerId,
                productName: query,
                category: String(category),
                status: "PENDING"
            }
        });
        console.log(request);
        console.log(request.id);
        await demand_queue_1.demandQueue.add("product-demand", {
            requestId: request.id,
            buyerId,
            category,
            productName: query,
            latitude,
            longitude
        }, {
            jobId: `buyer-request-${buyerId}-${query.toLowerCase().trim()}`
        });
        return res.status(200).json({
            source: "seller-demand",
            requestId: request.id,
            message: "No product found. Sellers notified.",
            products: []
        });
    }
    console.log("matches", matches);
    const relevanceByProductId = new Map(matches.map((m) => [m.productId, m._count.keyword]));
    const productIds = [...relevanceByProductId.keys()];
    console.log("productIds", productIds);
    const products = await __1.prisma.$queryRaw `
SELECT

    p.id,
    p.name,
    p.category,
    p."images",
    p.price,
    p."sellerId",

    ST_Distance(

        ST_SetSRID(
            ST_MakePoint(
                s.longitude,
                s.latitude
            ),
            4326
        )::geography,

        ST_SetSRID(
            ST_MakePoint(
                ${Number(longitude)},
                ${Number(latitude)}
            ),
            4326
        )::geography

    ) AS distance_meters


FROM "Product" p

JOIN "Seller" s
ON p."sellerId" = s.id


WHERE

p.id IN (${client_1.Prisma.join(productIds)})


AND

ST_DWithin(

    ST_SetSRID(
        ST_MakePoint(
            s.longitude,
            s.latitude
        ),
        4326
    )::geography,


    ST_SetSRID(
        ST_MakePoint(
            ${Number(longitude)},
            ${Number(latitude)}
        ),
        4326
    )::geography,

    ${searchRadiusMeters}

)

`;
    console.log("before", products);
    const results = products.map((product) => ({
        ...product,
        relevance: relevanceByProductId.get(product.id) ?? 0,
    }));
    console.log("after", results);
    if (results.length > 0) {
        return res.status(200).json({
            source: "nearby-products",
            results
        });
    }
    await demand_queue_1.demandQueue.add("product-demand", {
        buyerId,
        category,
        productName: query,
        latitude,
        longitude
    }, {
        jobId: `buyer-request-${buyerId}-${query}`
    });
    console.log(results);
    return res.status(200).json({
        source: "seller-demand",
        message: "No nearby product found. Nearby sellers are notified.",
        products: []
    });
});
exports.getProduct = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.default(404, "Missing Product ID");
    }
    const product = await __1.prisma.product.findUnique({
        where: {
            id: Number(id),
        },
        include: {
            Seller: true
        }
    });
    if (!product) {
        throw new ApiError_1.default(404, "No product found ");
    }
    return res.status(200).json(new ApiResponse_1.default(200, product, "Product fetcehd successfully"));
});
exports.placeOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    // -----------------------------
    // 1. Validate input
    // -----------------------------
    if (!productId || !quantity || quantity <= 0) {
        throw new ApiError_1.default(400, "Product ID and valid quantity are required");
    }
    // -----------------------------
    // 2. Find buyer
    // -----------------------------
    const buyer = await __1.prisma.buyer.findUnique({
        where: {
            userId,
        },
    });
    if (!buyer) {
        throw new ApiError_1.default(404, "Buyer not found");
    }
    // -----------------------------
    // 3. Find product + seller
    // -----------------------------
    const product = await __1.prisma.product.findUnique({
        where: {
            id: Number(productId),
        },
        include: {
            Seller: {
                select: {
                    id: true,
                    userId: true,
                    shopName: true,
                },
            },
        },
    });
    if (!product) {
        throw new ApiError_1.default(404, "Product not found");
    }
    // -----------------------------
    // 4. Get seller from product
    // -----------------------------
    const seller = product.Seller;
    if (!seller) {
        throw new ApiError_1.default(404, "Seller not found for this product");
    }
    // -----------------------------
    // 5. Create order
    // -----------------------------
    const order = await __1.prisma.order.create({
        data: {
            buyerId: buyer.id,
            sellerId: seller.id,
            name: product.name,
            quantity,
            status: "PENDING",
        },
    });
    // -----------------------------
    // 6. Add order to queue
    // -----------------------------
    const job = await order_queue_1.orderQueue.add("processOrder", {
        orderId: order.id,
        name: product.name,
        buyerId: buyer.id,
        sellerId: seller.id,
    }, {
        jobId: `order-${order.id}`,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
    });
    // -----------------------------
    // 7. Log
    // -----------------------------
    console.log("🔥🔥 ORDER JOB ADDED:", {
        jobId: job.id,
        orderId: order.id,
        productId: product.id,
        buyerId: buyer.id,
        sellerId: seller.id,
    });
    // -----------------------------
    // 8. Response
    // -----------------------------
    return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        order: {
            id: order.id,
            productId: product.id,
            name: product.name,
            quantity: order.quantity,
            status: order.status,
            sellerId: seller.id,
            shopName: seller.shopName,
            createdAt: order.createdAt,
        },
    });
});
exports.confirmOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const sellerId = req.user?.id;
    const { acceptance } = req.body;
    if (!id)
        throw new ApiError_1.default(400, "Id is not found");
    if (!["Accepted", "Rejected"].includes(acceptance)) {
        throw new ApiError_1.default(400, "Invalid acceptance value");
    }
    if (acceptance === "Accepted") {
        const result = await __1.prisma.order.updateMany({
            where: {
                id: Number(id),
                sellerId: null,
            },
            data: {
                sellerId,
                status: "ACCEPTED",
            },
        });
        if (result.count === 0) {
            throw new ApiError_1.default(400, "Order already accepted");
        }
        const updatedOrder = await __1.prisma.order.findUnique({
            where: { id: Number(id) },
        });
        if (!updatedOrder) {
            throw new ApiError_1.default(404, "");
        }
        await notification_queue_1.notificationQueue.add("notifyBuyer", {
            type: "ORDER_ACCEPTED",
            userId: updatedOrder.buyerId,
            message: "Your order has been accepted ",
        });
        return res.status(200).json(new ApiResponse_1.default(200, updatedOrder, "Order accepted"));
    }
});
exports.listOrders = (0, asyncHandler_1.default)(async (req, res) => {
    const ownerId = req.user?.id;
    if (!ownerId) {
        throw new ApiError_1.default(404, "OwnerId not found");
    }
    const cursor = req.query.cursor
        ? Number(req.query.cursor)
        : undefined;
    const key = cursor
        ? `orders:${ownerId}:${cursor}`
        : `orders:${ownerId}:first`;
    const cachedData = await redis_1.client.get(key);
    if (cachedData) {
        return res.status(200).json(new ApiResponse_1.default(200, JSON.parse(cachedData), "Fetched from cache"));
    }
    const orders = await __1.prisma.order.findMany({
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
        await redis_1.client.setex(key, 100, JSON.stringify(responseData));
    }
    return res.status(200).json(new ApiResponse_1.default(200, responseData, "Fetched orders successfully"));
});
exports.cancelOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const { orderId } = req.params;
    const id = Number(orderId);
    if (!id || isNaN(id)) {
        throw new ApiError_1.default(400, "Invalid Order ID");
    }
    const order = await __1.prisma.order.findUnique({
        where: { id }
    });
    if (!order) {
        throw new ApiError_1.default(404, "Order not found");
    }
    if (order.buyerId !== req.user.id) {
        throw new ApiError_1.default(403, "Unauthorized");
    }
    if (order.status !== "PENDING") {
        throw new ApiError_1.default(409, "Order cannot be cancelled after processing");
    }
    const deletedOrder = await __1.prisma.order.delete({
        where: { id }
    });
    return res.status(200).json(new ApiResponse_1.default(200, deletedOrder, "Order cancelled successfully"));
});
