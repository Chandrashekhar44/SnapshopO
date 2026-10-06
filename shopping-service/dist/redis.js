"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueConnection = exports.client = void 0;
const ioredis_1 = require("ioredis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
}
exports.client = new ioredis_1.Redis(redisUrl, {
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
});
exports.queueConnection = new ioredis_1.Redis(redisUrl, {
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
});
exports.client.on("error", (err) => {
    console.error("Redis Cache Error:", err);
});
exports.queueConnection.on("error", (err) => {
    console.error("Redis Queue Error:", err);
});
