import { describe, expect, it } from "vitest";
import { formatTimeSpent, calculateCoursePercentage } from "@/modules/learning/navigation";

describe("learning progress display", () => {
  it("formats hours and minutes", () => {
    expect(formatTimeSpent(3_661_000)).toBe("1h 1m");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimeSpent(125_000)).toBe("2m 5s");
  });

  it("formats seconds only", () => {
    expect(formatTimeSpent(42_000)).toBe("42s");
  });

  it("calculateCoursePercentage handles zero total", () => {
    expect(calculateCoursePercentage(0, 0)).toBe(0);
  });

  it("calculateCoursePercentage rounds completed lessons", () => {
    expect(calculateCoursePercentage(1, 3)).toBe(33);
  });
});
