import dotenv from "dotenv";
import Redis from "ioredis";


dotenv.config();
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}
const redisOptions = {
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,

  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  },
};

export const client = new Redis(redisUrl, redisOptions);

export const queueConnection = new Redis(redisUrl, {
  ...redisOptions,
  maxRetriesPerRequest: null,
});

client.on("connect", () => {
  console.log("Redis cache connection established");
});

client.on("ready", () => {
  console.log("Redis cache is ready");
});

client.on("error", (error) => {
  console.error("Redis cache error:", error);
});

client.on("close", () => {
  console.log("Redis cache connection closed");
});

queueConnection.on("connect", () => {
  console.log("Redis queue connection established");
});

queueConnection.on("ready", () => {
  console.log("Redis queue is ready");
});

queueConnection.on("error", (error) => {
  console.error("Redis queue error:", error);
});

queueConnection.on("close", () => {
  console.log("Redis queue connection closed");
});

const shutdown = async () => {
  console.log("Closing Redis connections...");

  try {
    await client.quit();
    await queueConnection.quit();

    console.log("Redis connections closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error while closing Redis:", error);
    process.exit(1);
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);