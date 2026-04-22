import { NotificationProvider } from "../interface/notification.interface.js";
import { EmailProvider } from "../providers/email.provider.js";
import { WhatsAppProvider } from "../providers/whatsapp.provider.js";

export class NotificationFactory {
  private static providers: Record<string, NotificationProvider> = {
    email: new EmailProvider(),
    whatsapp: new WhatsAppProvider(),

  };

  static getProvider(type: string): NotificationProvider {
    const provider = this.providers[type];

    if (!provider) {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    return provider;
  }
}
