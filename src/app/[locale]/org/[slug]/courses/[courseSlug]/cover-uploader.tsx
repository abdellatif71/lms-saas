"use client";

import FileUploader from "@/components/file-uploader";

export default function CourseCoverUploader({ orgSlug }: { orgSlug: string }) {
  return <FileUploader orgSlug={orgSlug} purpose="COURSE_COVER" accept="image/jpeg,image/png,image/webp" onUploaded={() => undefined} />;
}
