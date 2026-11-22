import { Resend } from "resend";
import { logger } from "@/lib/logger";
import type { EmailMessage, EmailProvider } from "./provider";

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html !== undefined ? { html: message.html } : {}),
    });
    if (error) {
      logger.error({ err: error, to: message.to }, "Resend send failed");
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
