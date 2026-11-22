import { describe, expect, it } from "vitest";
import { questionCreateSchema } from "@/modules/questions/validation";

const base = { courseId: "11111111-1111-4111-8111-111111111111", scope: "COURSE" as const, prompt: "Valid question prompt" };

describe("question type validation", () => {
  it("MCQ requires exactly one correct option", () => {
    expect(questionCreateSchema.safeParse({ ...base, type: "MCQ", options: [{ label: "A", isCorrect: false, position: 0 }, { label: "B", isCorrect: false, position: 1 }] }).success).toBe(false);
  });
  it("MCQ requires at least two options", () => { expect(questionCreateSchema.safeParse({ ...base, type: "MCQ", options: [{ label: "A", isCorrect: true, position: 0 }] }).success).toBe(false); });
  it("MCQ rejects more than ten options", () => { const options = Array.from({ length: 11 }, (_, position) => ({ label: `A${position}`, isCorrect: position === 0, position })); expect(questionCreateSchema.safeParse({ ...base, type: "MCQ", options }).success).toBe(false); });
  it("TRUE_FALSE requires correctBoolean", () => { expect(questionCreateSchema.safeParse({ ...base, type: "TRUE_FALSE" }).success).toBe(false); });
  it("SHORT_ANSWER requires expectedAnswer", () => { expect(questionCreateSchema.safeParse({ ...base, type: "SHORT_ANSWER" }).success).toBe(false); });
  it("LONG_ANSWER allows optional expectedAnswer", () => { expect(questionCreateSchema.safeParse({ ...base, type: "LONG_ANSWER" }).success).toBe(true); });
});
