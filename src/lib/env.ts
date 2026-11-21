import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default(''),
  AUTH_SECRET: z.string().default(''),
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('lms-dev'),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  AI_OPENAI_KEY: z.string().default(''),
  AI_GEMINI_KEY: z.string().default(''),
  AI_DEEPSEEK_KEY: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.parse(process.env);

if (process.env.NODE_ENV !== 'test') {
  if (!parsed.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  if (!parsed.AUTH_SECRET) {
    throw new Error('Missing required environment variable: AUTH_SECRET');
  }
}

export const env = parsed;
