import amqp from "amqplib";
const QUEUE_NAME = "notification_queue";
let channel = null;
export const connectQueue = async () => {
    const connection = await amqp.connect("amqp://localhost");
    channel =
        await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, {
        durable: true
    });
    console.log("RabbitMQ connected");
};
export const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }
    return channel;
};
export const QUEUE = QUEUE_NAME;
