import { describe, expect, it } from "vitest";
import { sessionCommandSchema } from "./session-ipc";

describe("session IPC command", () => {
  it("accepts an optional goal and normalizes whitespace-only input", () => {
    const result = sessionCommandSchema.parse({
      type: "start",
      goal: "   ",
      durationMinutes: 60,
    });

    expect(result).toMatchObject({ type: "start", goal: "" });
  });

  it("rejects overlong goals, malformed times, and extra authority", () => {
    expect(
      sessionCommandSchema.safeParse({
        type: "start",
        goal: "x".repeat(241),
        durationMinutes: 60,
      }).success,
    ).toBe(false);
    expect(
      sessionCommandSchema.safeParse({
        type: "start",
        goal: "Write",
        durationMinutes: "60",
      }).success,
    ).toBe(false);
    expect(
      sessionCommandSchema.safeParse({ type: "end", tabId: 7 }).success,
    ).toBe(false);
  });
});
