import { describe, expect, it } from "vitest";
import { assertMimeAllowed, sniffMime } from "@/lib/storage/mime";

describe("magic-byte MIME detection", () => {
  it("sniffMime identifies PNG, PDF, and MP4 headers", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]), Buffer.alloc(16, 0)]);
    expect(await sniffMime(png)).toBe("image/png");
    expect(await sniffMime(pdf)).toBe("application/pdf");
    expect(await sniffMime(mp4)).toBe("video/mp4");
  });

  it("assertMimeAllowed rejects MIME mismatch", () => {
    expect(() => assertMimeAllowed("LESSON_PDF", "application/pdf", "image/png")).toThrow();
  });
});
