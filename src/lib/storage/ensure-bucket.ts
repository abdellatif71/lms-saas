import { HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./s3-client";
import { logger } from "@/lib/logger";

let ensured = false;

export async function ensureBucket(): Promise<void> {
  if (ensured) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      logger.info({ bucket: BUCKET }, "Created private bucket");
    } catch (e) {
      logger.error({ err: e }, "Failed to create bucket");
      throw e;
    }
  }
  ensured = true;
}
