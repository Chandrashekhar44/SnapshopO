"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
exports.notificationQueue = new bullmq_1.Queue("notificationQueue", {
    connection: redis_1.queueConnection,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: {
            age: 3600,
        },
        removeOnFail: {
            age: 86400,
        },
    },
});
