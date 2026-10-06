import { getChannel, QUEUE } from "./rabbitMq.config.js";


export const publishNotification = async(data:{
    type:string;
    to:string;
    message:string;
})=>{


    const channel = getChannel();


    channel.sendToQueue(
        QUEUE,
        Buffer.from(
            JSON.stringify(data)
        ),
        {
            persistent:true
        }
    );


    console.log(
      "Notification pushed to RabbitMQ"
    );

};