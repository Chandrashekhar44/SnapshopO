import { NotificationFactory } from "../factory/notification.factory.js";

export const sendNotification = async (
  type: string,
  to: string,
  message: string
) => {
  const provider = NotificationFactory.getProvider(type);

  await provider.send(to, message);
};
