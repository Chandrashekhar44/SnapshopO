import { getMessaging } from "firebase-admin/messaging";
import { NotificationProvider } from "../interface/notification.interface.js";


export class FCMProvider implements NotificationProvider {


async send(
  to:string,
  message:string
):Promise<void>{


 await getMessaging().send({

    token:to,


    notification:{

      title:"SnapShop Buyer Request",

      body:message

    }


 });


 console.log(
   "FCM notification sent"
 );


}


}