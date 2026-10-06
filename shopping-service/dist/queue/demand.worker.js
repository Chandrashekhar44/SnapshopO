"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
const index_1 = require("../index");
const notification_queue_1 = require("./notification.queue");
console.log("DEMAND WORKER PID", process.pid);
const worker = new bullmq_1.Worker("demandQueue", async (job) => {
    const { requestId, buyerId, category, productName, latitude, longitude } = job.data;
    console.log({
        category,
        latitude,
        longitude
    });
    const sellers = await index_1.prisma.$queryRaw `

SELECT

s.id,
s."userId"

FROM "Seller" s


WHERE

LOWER(s."shopCategory") = LOWER(${category})


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
${longitude},
${latitude}
),
4326
)::geography,


5000

)

`;
    const sellerUserIds = sellers.map((seller) => seller.userId);
    if (sellerUserIds.length > 0) {
        const notificationJob = await notification_queue_1.notificationQueue.add("notification", {
            requestId,
            type: "REQUEST",
            sellerUserIds,
            buyerId,
            productName,
            category,
        }, {
            jobId: `request-${requestId}`,
        });
    }
}, {
    connection: redis_1.queueConnection,
    concurrency: 2
});
exports.default = worker;
