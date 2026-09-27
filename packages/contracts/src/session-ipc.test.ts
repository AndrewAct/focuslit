import { describe, expect, it } from "vitest";
import { sessionCommandSchema } from "./session-ipc";

describe("session IPC command", () => {
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
