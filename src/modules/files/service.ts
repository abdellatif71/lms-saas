import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { s3, BUCKET } from "@/lib/storage/s3-client";
import { ensureBucket } from "@/lib/storage/ensure-bucket";
import { assertMimeAllowed, maxBytesFor, sniffMime } from "@/lib/storage/mime";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { AuthContext } from "@/modules/auth/permissions";
import { FilePurpose } from "@/generated/prisma/enums";

const UPLOAD_TTL_SECONDS = 15 * 60;
const DOWNLOAD_TTL_SECONDS = 60;

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/zip": "zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function requestUpload(
  ctx: AuthContext,
  input: { purpose: FilePurpose; filename: string; declaredMime: string; sizeBytes: number },
) {
  const max = maxBytesFor(input.purpose);
  if (input.sizeBytes > max) {
    throw new ValidationError(`File exceeds max size for ${input.purpose}: ${max} bytes`);
  }
  await ensureBucket();
  const ext = EXT_BY_MIME[input.declaredMime] ?? "bin";
  const storageKey = `org/${ctx.organizationId}/${input.purpose}/${randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: input.declaredMime,
    ContentLength: input.sizeBytes,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { uploadUrl, storageKey, expiresIn: UPLOAD_TTL_SECONDS };
}

export async function confirmUpload(
  ctx: AuthContext,
  input: {
    storageKey: string;
    purpose: FilePurpose;
    originalName: string;
    declaredMime: string;
    declaredSize: number;
  },
) {
  await ensureBucket();
  if (!input.storageKey.startsWith(`org/${ctx.organizationId}/`)) {
    throw new ForbiddenError("Storage key does not belong to this organization");
  }
  if (!input.storageKey.includes(`/${input.purpose}/`)) {
    throw new ForbiddenError("Storage key purpose does not belong to this upload");
  }

  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: input.storageKey }));
  } catch {
    throw new NotFoundError("Uploaded file not found in storage");
  }

  const size = Number(head.ContentLength ?? 0);
  if (size !== input.declaredSize) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: input.storageKey }));
    throw new ValidationError("Declared file size does not match uploaded file");
  }
  if (size > maxBytesFor(input.purpose)) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: input.storageKey }));
    throw new ValidationError("File exceeds max size");
  }

  const snippet = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: input.storageKey,
    Range: "bytes=0-4095",
  }));
  const buffer = Buffer.from(await snippet.Body!.transformToByteArray());
  const detected = await sniffMime(buffer);
  const actualMime = head.ContentType ?? input.declaredMime;
  assertMimeAllowed(input.purpose, input.declaredMime, detected);

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const file = await prisma.file.create({
    data: {
      organizationId: ctx.organizationId,
      uploadedById: ctx.userId,
      storageKey: input.storageKey,
      sizeBytes: BigInt(size),
      mimeType: detected ?? actualMime,
      originalName: input.originalName,
      checksum,
      purpose: input.purpose,
    },
  });

  await audit({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    action: "FILE.UPLOADED",
    targetType: "File",
    targetId: file.id,
    metadata: { purpose: input.purpose, size },
  });
  return { fileId: file.id };
}

export async function getDownloadUrl(ctx: AuthContext, fileId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, organizationId: ctx.organizationId },
  });
  if (!file) throw new NotFoundError("File not found");

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.storageKey });
  const url = await getSignedUrl(s3, command, { expiresIn: DOWNLOAD_TTL_SECONDS });
  return {
    url,
    expiresIn: DOWNLOAD_TTL_SECONDS,
    mimeType: file.mimeType,
    originalName: file.originalName,
  };
}

export async function deleteFile(ctx: AuthContext, fileId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, organizationId: ctx.organizationId },
  });
  if (!file) throw new NotFoundError("File not found");

  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.storageKey }));
  await prisma.file.delete({ where: { id: file.id } });
  await audit({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    action: "FILE.DELETED",
    targetType: "File",
    targetId: file.id,
  });
}
