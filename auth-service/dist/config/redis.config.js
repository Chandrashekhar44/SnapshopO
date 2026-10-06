"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueConnection = exports.client = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const ioredis_1 = __importDefault(require("ioredis"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
}
const redisOptions = {
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
    },
};
exports.client = new ioredis_1.default(redisUrl, redisOptions);
exports.queueConnection = new ioredis_1.default(redisUrl, {
    ...redisOptions,
    maxRetriesPerRequest: null,
});
exports.client.on("connect", () => {
    console.log("Redis cache connection established");
});
exports.client.on("ready", () => {
    console.log("Redis cache is ready");
});
exports.client.on("error", (error) => {
    console.error("Redis cache error:", error);
});
exports.client.on("close", () => {
    console.log("Redis cache connection closed");
});
exports.queueConnection.on("connect", () => {
    console.log("Redis queue connection established");
});
exports.queueConnection.on("ready", () => {
    console.log("Redis queue is ready");
});
exports.queueConnection.on("error", (error) => {
    console.error("Redis queue error:", error);
});
exports.queueConnection.on("close", () => {
    console.log("Redis queue connection closed");
});
const shutdown = async () => {
    console.log("Closing Redis connections...");
    try {
        await exports.client.quit();
        await exports.queueConnection.quit();
        console.log("Redis connections closed successfully");
        process.exit(0);
    }
    catch (error) {
        console.error("Error while closing Redis:", error);
        process.exit(1);
    }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
//# sourceMappingURL=redis.config.js.map