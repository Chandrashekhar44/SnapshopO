import { Queue } from "bullmq";
import { queueConnection } from "../redis";

export const demandQueue = new Queue("demandQueue", {
  connection: queueConnection,
});