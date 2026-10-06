export class WhatsAppProvider {
    async send(to, message) {
        console.log(` WhatsApp sent to ${to}: ${message}`);
    }
}
