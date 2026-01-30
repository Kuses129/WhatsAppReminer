import Twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // The Twilio sandbox/production WhatsApp number
}

export class TwilioClient {
  private client: Twilio.Twilio;
  private whatsappNumber: string;

  constructor(config: TwilioConfig) {
    this.client = Twilio(config.accountSid, config.authToken);
    this.whatsappNumber = config.whatsappNumber;
  }

  /**
   * Send a WhatsApp message via Twilio
   * @param to - Recipient phone number (e.g., "+1234567890")
   * @param body - Message text
   */
  async sendMessage(to: string, body: string): Promise<string> {
    // Ensure numbers have whatsapp: prefix
    const fromNumber = this.whatsappNumber.startsWith('whatsapp:')
      ? this.whatsappNumber
      : `whatsapp:${this.whatsappNumber}`;

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const message = await this.client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: body,
    });

    console.log(`Message sent: ${message.sid}`);
    return message.sid;
  }

  /**
   * Format phone number for consistency
   */
  static normalizePhoneNumber(phone: string): string {
    // Remove whatsapp: prefix if present
    return phone.replace('whatsapp:', '');
  }
}
