"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productSearchIndex = exports.ProductSearchIndex = void 0;
const tokenizer_1 = require("./tokenizer");
const FIELD_WEIGHTS = {
    name: 10,
    category: 5,
};
class ProductSearchIndex {
    constructor() {
        this.index = new Map();
        this.wordsByProduct = new Map();
    }
    addProduct(product) {
        this.removeProduct(product.id);
        const nameWords = (0, tokenizer_1.tokenize)(product.name);
        const categoryWords = (0, tokenizer_1.tokenize)(product.category);
        for (const word of nameWords) {
            this.addEntry(word, product, FIELD_WEIGHTS.name);
        }
        for (const word of categoryWords) {
            this.addEntry(word, product, FIELD_WEIGHTS.category);
        }
        this.wordsByProduct.set(product.id, [...nameWords, ...categoryWords]);
    }
    removeProduct(productId) {
        const words = this.wordsByProduct.get(productId);
        if (!words)
            return;
        for (const word of words) {
            const entries = this.index.get(word);
            if (!entries)
                continue;
            const filtered = entries.filter((entry) => entry.productId !== productId);
            if (filtered.length > 0) {
                this.index.set(word, filtered);
            }
            else {
                this.index.delete(word);
            }
        }
        this.wordsByProduct.delete(productId);
    }
    search(query) {
        const words = (0, tokenizer_1.tokenize)(query);
        const scoreByProduct = new Map();
        for (const word of words) {
            const entries = this.index.get(word);
            if (!entries)
                continue;
            for (const entry of entries) {
                const existing = scoreByProduct.get(entry.productId);
                if (existing) {
                    existing.score += entry.weight;
                }
                else {
                    scoreByProduct.set(entry.productId, {
                        productId: entry.productId,
                        sellerId: entry.sellerId,
                        score: entry.weight,
                    });
                }
            }
        }
        return [...scoreByProduct.values()].sort((a, b) => b.score - a.score);
    }
    get size() {
        return this.wordsByProduct.size;
    }
    clear() {
        this.index.clear();
        this.wordsByProduct.clear();
    }
    addEntry(word, product, weight) {
        const entries = this.index.get(word) ?? [];
        entries.push({ productId: product.id, sellerId: product.sellerId, weight });
        this.index.set(word, entries);
    }
}
exports.ProductSearchIndex = ProductSearchIndex;
exports.productSearchIndex = new ProductSearchIndex();
