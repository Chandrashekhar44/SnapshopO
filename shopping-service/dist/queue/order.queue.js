"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
exports.orderQueue = new bullmq_1.Queue("orderQueue", {
    connection: redis_1.queueConnection,
});
