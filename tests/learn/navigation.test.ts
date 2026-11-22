import { describe, expect, it } from "vitest";
import { flattenLessons, getPrevLesson, getNextLesson } from "@/modules/learning/navigation";

const modules = [
  { id: "m2", title: "Second", position: 1, lessons: [{ id: "l3", title: "C", position: 0 }, { id: "l4", title: "D", position: 1 }] },
  { id: "m1", title: "First", position: 0, lessons: [{ id: "l2", title: "B", position: 1 }, { id: "l1", title: "A", position: 0 }] },
];

describe("lesson navigation", () => {
  it("flattenLessons orders modules then lessons by position", () => {
    expect(flattenLessons(modules).map((lesson) => lesson.id)).toEqual(["l1", "l2", "l3", "l4"]);
  });

  it("getPrevLesson and getNextLesson return correct neighbors", () => {
    expect(getPrevLesson(modules, "l1")).toBeNull();
    expect(getNextLesson(modules, "l1")?.id).toBe("l2");
    expect(getPrevLesson(modules, "l3")?.id).toBe("l2");
    expect(getNextLesson(modules, "l4")).toBeNull();
  });

  it("boundaries return null for prev at first and next at last", () => {
    expect(getPrevLesson(modules, "l1")).toBeNull();
    expect(getNextLesson(modules, "l4")).toBeNull();
  });
});
