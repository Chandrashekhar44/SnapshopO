import { Queue } from "bullmq";
import { queueConnection } from "../redis";

export const notificationQueue = new Queue("notificationQueue", {
  connection: queueConnection,
});