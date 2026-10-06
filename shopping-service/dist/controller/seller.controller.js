"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedListings = exports.uploadImage = exports.createProduct = void 0;
const __1 = require("..");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const ApiResponse_1 = __importDefault(require("../utils/ApiResponse"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const indexer_1 = require("../search-service/indexer");
exports.createProduct = (0, asyncHandler_1.default)(async (req, res) => {
    const { productName, price, category, images } = req.body;
    const userId = req.user.id;
    console.log(userId);
    console.log(productName, price, category);
    if (!productName || !price || !category) {
        throw new ApiError_1.default(400, "All fields are required");
    }
    if (images.length == 0) {
        throw new ApiError_1.default(400, "Upload atleast one image");
    }
    const user = await __1.prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        throw new ApiError_1.default(404, "No user found, kindly login");
    }
    const sellerWala = await __1.prisma.seller.findFirst({
        where: {
            shopName: user.username
        }
    });
    if (!sellerWala) {
        throw new ApiError_1.default(400, "No seller found");
    }
    const product = await __1.prisma.product.create({
        data: {
            name: productName,
            price: parseFloat(price),
            category: category,
            sellerId: sellerWala.id,
            images
        }
    });
    if (!product) {
        throw new ApiError_1.default(400, "Product not created try again");
    }
    (0, indexer_1.addProductIndex)(product);
    res.status(200).json(new ApiResponse_1.default(200, product, "Successfully added product to selling list"));
});
const database_configure_1 = require("../configure/database.configure ");
const crypto_1 = __importDefault(require("crypto"));
const uploadImage = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                message: "No images uploaded",
            });
        }
        const imageUrls = [];
        for (const file of files) {
            const fileName = `${crypto_1.default.randomUUID()}-${file.originalname}`;
            const { error } = await database_configure_1.supabase.storage
                .from("product-images")
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
            });
            if (error)
                throw error;
            const { data } = database_configure_1.supabase.storage
                .from("product-images")
                .getPublicUrl(fileName);
            imageUrls.push(data.publicUrl);
        }
        return res.json({
            success: true,
            imageUrls,
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Upload failed",
        });
    }
};
exports.uploadImage = uploadImage;
const seedListings = async (req, res) => {
    const userId = req.user;
    try {
        const sellerId = await __1.prisma.seller.findUnique({
            where: {
                userId: userId.id
            }
        });
        const response = await __1.prisma.product.findMany({
            where: {
                sellerId: sellerId?.id
            }
        });
        return res.status(200).json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "seedListings fetch failed"
        });
    }
};
exports.seedListings = seedListings;
