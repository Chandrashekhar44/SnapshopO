import { Queue } from "bullmq";
import { queueConnection } from "../redis";

export const notificationQueue = new Queue(
  "notificationQueue",
  {
    connection: queueConnection,

    defaultJobOptions: {
      attempts: 1,

      removeOnComplete: {
        age: 3600, 
      },

      removeOnFail: {
        age: 86400, 
      },
    },
  }
);