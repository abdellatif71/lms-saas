import type { EmailProvider } from "./provider";
import { logger } from "@/lib/logger";

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (instance) return instance;

  instance = {
    async send(message) {
      logger.warn(
        { to: message.to, subject: message.subject },
        "Email delivery is disabled; email ignored",
      );
    },
  };
  return instance;
}
