import { NotificationProvider } from "../interface/notification.interface.js";

export class WhatsAppProvider implements NotificationProvider {
  async send(to: string, message: string): Promise<void> {
    // Future integration (Twilio / WhatsApp API)
    console.log(`💬 WhatsApp sent to ${to}: ${message}`);
  }
}
