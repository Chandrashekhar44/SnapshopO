import { Redis } from "ioredis";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}


export const client = new Redis(redisUrl, {
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,
});


export const queueConnection = new Redis(redisUrl, {
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,

  // required for BullMQ
  maxRetriesPerRequest: null,
});



// Cache redis events
client.on("connect", () => {
  console.log("✅ Redis cache connected");
});

client.on("ready", () => {
  console.log("✅ Redis cache ready");
});

client.on("error", (err) => {
  console.error(
    "❌ Redis Cache Error:",
    err
  );
});

client.on("reconnecting", () => {
  console.log(
    "♻️ Redis cache reconnecting"
  );
});



// Queue redis events
queueConnection.on("connect", () => {
  console.log("✅ Redis queue connected");
});

queueConnection.on("ready", () => {
  console.log("✅ Redis queue ready");
});

queueConnection.on("error", (err) => {
  console.error(
    "❌ Redis Queue Error:",
    err
  );
});

queueConnection.on("reconnecting", () => {
  console.log(
    "♻️ Redis queue reconnecting"
  );
});