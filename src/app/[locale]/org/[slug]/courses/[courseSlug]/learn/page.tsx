import { redirect } from "next/navigation";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { getResumePosition } from "@/modules/learning/service";

export default async function LearnCoursePage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);

  const resume = await getResumePosition(ctx, courseSlug);
  if (resume.completed) redirect(`/${locale}/org/${slug}/courses/${courseSlug}/learn/complete`);
  if (resume.empty || !resume.lessonId) redirect(`/${locale}/org/${slug}/my-courses`);
  redirect(`/${locale}/org/${slug}/courses/${courseSlug}/learn/${resume.lessonId}`);
}
