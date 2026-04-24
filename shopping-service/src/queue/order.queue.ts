import { Queue } from "bullmq";
import { queueConnection } from "../../services/auth-service/config/redis.js";

const orderQueue = new Queue("orderQueue", {
  connection: queueConnection,
});
