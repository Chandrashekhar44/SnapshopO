import amqp from "amqplib";

const QUEUE_NAME = "notification_queue";

let channel: amqp.Channel;

export const connectQueue = async () => {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log("RabbitMQ connected");
};

export const getChannel = () => channel;
export const QUEUE = QUEUE_NAME;
