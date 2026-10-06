import { EmailProvider } from "../providers/email.provider.js";
import { FCMProvider } from "../providers/fcmProvider.js";
import { WhatsAppProvider } from "../providers/whatsapp.provider.js";
export class NotificationFactory {
    static getProvider(type) {
        const provider = this.providers[type];
        if (!provider) {
            throw new Error(`Unsupported notification type: ${type}`);
        }
        return provider;
    }
}
NotificationFactory.providers = {
    email: new EmailProvider(),
    whatsapp: new WhatsAppProvider(),
    fcm: new FCMProvider()
};
