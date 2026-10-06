import { NotificationFactory } from "../factory/notification.factory.js";
export const sendNotification = async (type, to, message) => {
    const provider = NotificationFactory.getProvider(type);
    await provider.send(to, message);
};
