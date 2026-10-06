"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProductIndex = addProductIndex;
exports.removeProductIndex = removeProductIndex;
const __1 = require("..");
const tokenizer_1 = require("./tokenizer");
async function addProductIndex(product) {
    const words = [
        ...new Set([
            ...(0, tokenizer_1.tokenize)(product.name),
            ...(0, tokenizer_1.tokenize)(product.category),
        ]),
    ];
    if (words.length === 0)
        return;
    await __1.prisma.searchIndex.createMany({
        data: words.map((keyword) => ({
            keyword,
            productId: product.id,
            sellerId: product.sellerId, // <-- add this
        })),
        skipDuplicates: true,
    });
}
async function removeProductIndex(productId) {
    await __1.prisma.searchIndex.deleteMany({
        where: { productId },
    });
}
