import { ConsoleEmailProvider } from "./console";
import type { EmailProvider } from "./provider";

let instance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!instance) instance = new ConsoleEmailProvider();
  return instance;
}
