export interface WahaConfig {
  apiUrl: string; // e.g., "http://localhost:3001"
  apiKey: string; // WAHA API key for authentication
  session: string; // Session name (default: "default")
}

export class WahaClient {
  private apiUrl: string;
  private apiKey: string;
  private session: string;

  constructor(config: WahaConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.apiKey = config.apiKey;
    this.session = config.session;
  }

  /**
   * Send a WhatsApp text message via WAHA
   * @param chatId - Recipient chat ID (e.g., "1234567890@c.us")
   * @param text - Message text
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    const url = `${this.apiUrl}/api/sendText`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
      },
      body: JSON.stringify({
        chatId,
        text,
        session: this.session,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WAHA sendText failed (${response.status}): ${errorText}`);
    }

    console.log(`Message sent to ${chatId}`);
  }

  /**
   * Convert a phone number to WAHA chat ID format.
   * Strips leading "+" and appends "@c.us".
   * If already in @c.us format, returns as-is.
   */
  static toChatId(phone: string): string {
    if (phone.endsWith('@c.us') || phone.endsWith('@g.us')) {
      return phone;
    }
    // Remove leading + and any non-digit characters
    const digits = phone.replace(/\D/g, '');
    return `${digits}@c.us`;
  }

  /**
   * Extract a readable phone number from a WAHA chat ID.
   * e.g., "1234567890@c.us" -> "+1234567890"
   */
  static fromChatId(chatId: string): string {
    const digits = chatId.replace(/@.*$/, '');
    return `+${digits}`;
  }
}
