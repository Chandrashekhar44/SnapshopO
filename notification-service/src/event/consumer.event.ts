import { getChannel, QUEUE } from "../config/rabbitMq.config.js";
import { sendNotification } from "../services/notification.service.js";

export const startConsumer = async () => {
  const channel = getChannel();

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());

    try {
      const { type, to, message } = data;

      await sendNotification(type, to, message);

      console.log("Notification processed");

      channel.ack(msg); 
    } catch (error) {

        if(data.retries < 3){
            data.retries++;

            channel.sendToQueue(QUEUE,Buffer.from(JSON.stringify(data)))
        }else{
            console.log('Max retries reached')
        }
        channel.ack(msg);
      console.error("Failed:", error);
    }
  });

  console.log(" Listening for messages...");
};
