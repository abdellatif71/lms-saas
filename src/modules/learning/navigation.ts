export type LearningModule = {
  id: string;
  title: string;
  position: number;
  lessons: Array<{ id: string; title: string; position: number }>;
};

export function flattenLessons(modules: LearningModule[]) {
  return [...modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module) => [...module.lessons].sort((a, b) => a.position - b.position));
}

export function getPrevLesson(modules: LearningModule[], lessonId: string) {
  const flattened = flattenLessons(modules);
  const index = flattened.findIndex((lesson) => lesson.id === lessonId);
  return index > 0 ? flattened[index - 1] : null;
}

export function getNextLesson(modules: LearningModule[], lessonId: string) {
  const flattened = flattenLessons(modules);
  const index = flattened.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 && index < flattened.length - 1 ? flattened[index + 1] : null;
}

export function formatTimeSpent(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function calculateCoursePercentage(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, completed) / total) * 100);
}
