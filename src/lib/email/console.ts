import { logger } from "@/lib/logger";
import type { EmailMessage, EmailProvider } from "./provider";

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      { to: message.to, subject: message.subject, body: message.text },
      "[ConsoleEmailProvider] Email (dev only, not sent)",
    );
  }
}
