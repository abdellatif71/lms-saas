import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/client";
import { getEnrolledCourseContent } from "@/modules/enrollment/service";
import { getCourseProgress } from "@/modules/learning/service";
import { flattenLessons, getPrevLesson, getNextLesson } from "@/modules/learning/navigation";
import { CoursePlayer } from "@/components/learning/course-player";
import { LessonViewer } from "../../../components/LessonViewer";

export default async function LessonLearnPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string; lessonId: string }> }) {
  const { locale, slug, courseSlug, lessonId } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const course = await getEnrolledCourseContent(ctx, courseSlug);
  const lessons = flattenLessons(course.modules.map((module) => ({ id: module.id, title: module.title, position: module.position, lessons: module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, position: lesson.position })) })));
  const active = lessons.find((lesson) => lesson.id === lessonId);
  if (!active) notFound();

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, module: { courseId: course.id } },
  });
  if (!lesson) notFound();

  const [courseProgress, progressRows] = await Promise.all([
    getCourseProgress(ctx, courseSlug),
    prisma.lessonProgress.findMany({ where: { organizationId: ctx.organizationId, studentUserId: ctx.userId, lessonId: { in: lessons.map((item) => item.id) } }, select: { lessonId: true, state: true } }),
  ]);
  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row.state]));
  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    position: module.position,
    lessons: module.lessons.map((item) => ({
      id: item.id,
      title: item.title,
      position: item.position,
      status: progressByLesson.get(item.id) === "COMPLETED" ? "COMPLETED" as const : progressByLesson.get(item.id) === "IN_PROGRESS" ? "IN_PROGRESS" as const : "NOT_STARTED" as const,
    })),
  }));
  const navigationModules = course.modules.map((module) => ({ id: module.id, title: module.title, position: module.position, lessons: module.lessons.map((item) => ({ id: item.id, title: item.title, position: item.position })) }));
  const prev = getPrevLesson(navigationModules, lessonId);
  const next = getNextLesson(navigationModules, lessonId);
  const learning = await getTranslations({ locale, namespace: "learning" });
  const learn = await getTranslations({ locale, namespace: "learn" });

  return (
    <CoursePlayer slug={slug} courseSlug={courseSlug} courseTitle={course.title} modules={modules} activeLessonId={lessonId} percentage={courseProgress.percentage}>
      <LessonViewer
        slug={slug}
        courseSlug={courseSlug}
        lessons={[lesson]}
        markCompleteLabel={learning("markComplete")}
        timeSpentLabel={learning("timeSpent")}
        completedLabel={learning("completed")}
        prev={prev ? { id: prev.id, label: learn("previous") } : null}
        next={next ? { id: next.id, label: learn("next") } : null}
        locale={locale}
        onLastCompleteHref={courseProgress.percentage === 100 ? `/${locale}/org/${slug}/courses/${courseSlug}/learn/complete` : undefined}
      />
    </CoursePlayer>
  );
}
