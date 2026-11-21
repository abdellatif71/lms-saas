import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function jsonError(e: unknown): NextResponse {
  if (isAppError(e)) {
    return NextResponse.json(
      { error: e.code, message: e.message, details: e.details },
      { status: e.httpStatus },
    );
  }
  logger.error({ err: e }, "Unhandled error");
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Something went wrong" },
    { status: 500 },
  );
}
