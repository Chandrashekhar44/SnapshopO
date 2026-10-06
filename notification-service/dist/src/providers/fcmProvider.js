import { getMessaging } from "firebase-admin/messaging";
export class FCMProvider {
    async send(to, message) {
        await getMessaging().send({
            token: to,
            notification: {
                title: "SnapShop Buyer Request",
                body: message
            }
        });
        console.log("FCM notification sent");
    }
}
