"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demandQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
exports.demandQueue = new bullmq_1.Queue("demandQueue", {
    connection: redis_1.queueConnection,
});
