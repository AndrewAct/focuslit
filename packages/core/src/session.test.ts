import { describe, expect, it } from "vitest";
import { initialSession, sessionView, transition } from "./session";

describe("session", () => {
  it("counts only running time through pause and resume", () => {
    const started = transition(initialSession, {
      type: "start",
      id: "a",
      goal: "Solve DP",
      durationMs: 60_000,
      atMs: 100,
    });
    const paused = transition(started, { type: "pause", atMs: 10_100 });
    expect(sessionView(paused, 50_000).remainingMs).toBe(50_000);
    const resumed = transition(paused, { type: "resume", atMs: 50_000 });
    expect(sessionView(resumed, 55_000).remainingMs).toBe(45_000);
    const ended = transition(resumed, { type: "tick", atMs: 100_000 });
    expect(ended.phase).toBe("ended");
    expect(sessionView(ended, 200_000).remainingMs).toBe(0);
  });

  it("does not replace an active session or resurrect an ended one", () => {
    const started = transition(initialSession, {
      type: "start",
      id: "a",
      goal: "Write",
      durationMs: 60_000,
      atMs: 0,
    });
    expect(
      transition(started, {
        type: "start",
        id: "b",
        goal: "Other",
        durationMs: 60_000,
        atMs: 1,
      }),
    ).toBe(started);
    const ended = transition(started, { type: "end", atMs: 5_000 });
    expect(transition(ended, { type: "resume", atMs: 9_000 })).toBe(ended);
  });

  it("allows an unnamed session and ignores clock rollback", () => {
    const unnamed = transition(initialSession, {
      type: "start",
      id: "x",
      goal: " ",
      durationMs: 1,
      atMs: 0,
    });
    expect(unnamed.phase).toBe("running");
    expect(unnamed.goal).toBe("");
    const started = transition(initialSession, {
      type: "start",
      id: "a",
      goal: "Read",
      durationMs: 60_000,
      atMs: 100,
    });
    expect(sessionView(started, 50).remainingMs).toBe(60_000);
    expect(transition(started, { type: "pause", atMs: 50 }).elapsedMs).toBe(0);
  });

  it("finishes when pause arrives after the deadline, including a delayed timer", () => {
    const started = transition(initialSession, {
      type: "start",
      id: "a",
      goal: "Read",
      durationMs: 1000,
      atMs: 0,
    });
    expect(transition(started, { type: "tick", atMs: 500 })).toBe(started);
    const ended = transition(started, { type: "pause", atMs: 1500 });
    expect(ended.phase).toBe("ended");
    expect(transition(ended, { type: "resume", atMs: 2000 })).toBe(ended);
  });

  it("ignores invalid and duplicate commands, and can end while paused", () => {
    expect(transition(initialSession, { type: "end", atMs: 0 })).toBe(
      initialSession,
    );
    expect(
      transition(initialSession, {
        type: "start",
        id: "",
        goal: "Read",
        durationMs: 1000,
        atMs: 0,
      }),
    ).toBe(initialSession);
    expect(
      transition(initialSession, {
        type: "start",
        id: "x",
        goal: "Read",
        durationMs: Number.NaN,
        atMs: 0,
      }),
    ).toBe(initialSession);
    expect(
      transition(initialSession, {
        type: "start",
        id: "x",
        goal: "Read",
        durationMs: 0,
        atMs: 0,
      }),
    ).toBe(initialSession);
    expect(transition(initialSession, { type: "resume", atMs: 1 })).toBe(
      initialSession,
    );
    expect(transition(initialSession, { type: "tick", atMs: 1 })).toBe(
      initialSession,
    );
    const started = transition(initialSession, {
      type: "start",
      id: "x",
      goal: "Read",
      durationMs: 1000,
      atMs: 0,
    });
    const paused = transition(started, { type: "pause", atMs: 100 });
    expect(transition(paused, { type: "pause", atMs: 200 })).toBe(paused);
    const ended = transition(paused, { type: "end", atMs: 900 });
    expect(ended.elapsedMs).toBe(100);
    expect(transition(ended, { type: "tick", atMs: 1000 })).toBe(ended);
  });
});
