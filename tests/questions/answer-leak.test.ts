import { describe, expect, it } from "vitest";
import { toStudentDTO, toTeacherDTO } from "@/modules/questions/dto";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";

const question = {
  id: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222", courseId: "33333333-3333-4333-8333-333333333333", moduleId: null, lessonId: null, authorId: "44444444-4444-4444-8444-444444444444",
  type: "MCQ" as const, scope: "COURSE" as const, prompt: "Which answer?", explanation: "Because A", points: 1,
  correctBoolean: null, expectedAnswer: null, acceptedAnswers: null, deletedAt: null,
  createdAt: new Date(), updatedAt: new Date(),
  options: [{ id: "55555555-5555-4555-8555-555555555555", questionId: "11111111-1111-4111-8111-111111111111", label: "A", isCorrect: true, position: 0, createdAt: new Date(), updatedAt: new Date() }],
};

describe("question answer leak prevention", () => {
  it("toStudentDTO strips isCorrect from options", () => { expect(toStudentDTO(question).options[0]).not.toHaveProperty("isCorrect"); });
  it("toStudentDTO strips correctBoolean", () => { expect(toStudentDTO(question)).not.toHaveProperty("correctBoolean"); });
  it("toStudentDTO strips expectedAnswer", () => { expect(toStudentDTO(question)).not.toHaveProperty("expectedAnswer"); });
  it("toStudentDTO strips acceptedAnswers", () => { expect(toStudentDTO(question)).not.toHaveProperty("acceptedAnswers"); });
  it("toStudentDTO strips explanation", () => { expect(toStudentDTO(question)).not.toHaveProperty("explanation"); });
  it("STUDENT cannot reach teacher DTO", () => {
    expect(() => assertTeacherOrAbove({ userId: "u", organizationId: "o", role: "STUDENT" })).toThrow();
  });
  it("toTeacherDTO includes all answer fields", () => {
    const teacher = toTeacherDTO(question);
    expect(teacher.options[0]?.isCorrect).toBe(true);
    expect(teacher).toHaveProperty("explanation");
  });
  it("STUDENT cannot reach teacher DTO via teacher guard", () => {
    expect(() => assertTeacherOrAbove({ userId: "u", organizationId: "o", role: "STUDENT" })).toThrow();
  });
});
