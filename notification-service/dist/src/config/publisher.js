import { getChannel, QUEUE } from "./rabbitMq.config.js";
export const publishNotification = async (data) => {
    const channel = getChannel();
    channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(data)), {
        persistent: true
    });
    console.log("Notification pushed to RabbitMQ");
};
