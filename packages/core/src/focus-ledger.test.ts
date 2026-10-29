import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creditFocus,
  emptyLedger,
  focusOnDay,
  initialCursor,
  localDayKey,
  type FocusSample,
} from "./focus-ledger";
import { initialSession, transition, type SessionEvent } from "./session";

const MINUTE = 60_000;
afterEach(() => vi.unstubAllEnvs());

function run(start: string, durationMs = 3 * 60 * MINUTE) {
  const origin = Date.parse(start);
  let state = initialSession;
  let step = { ledger: emptyLedger, cursor: initialCursor };
  function sample(atMs: number, wallMs = origin + atMs): FocusSample {
    return {
      monotonicMs: atMs,
      wallMs,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
  function credit(atMs: number, wallMs = origin + atMs, quit = false) {
    step = creditFocus(
      step.ledger,
      step.cursor,
      state,
      sample(atMs, wallMs),
      quit,
    );
  }
  function event(event: SessionEvent, wallMs = origin + event.atMs) {
    credit(event.atMs, wallMs);
    state = transition(state, event);
    credit(event.atMs, wallMs);
  }
  event({ type: "start", id: "a", goal: "study", durationMs, atMs: 0 });
  return {
    credit,
    event,
    get ledger() {
      return step.ledger;
    },
    get state() {
      return state;
    },
  };
}

describe("focus intervals", () => {
  it("ignores idle and repeated samples; sums separate sessions", () => {
    expect(
      creditFocus(emptyLedger, initialCursor, initialSession, {
        monotonicMs: 0,
        wallMs: 0,
        timeZone: "UTC",
      }).ledger,
    ).toBe(emptyLedger);
    vi.stubEnv("TZ", "UTC");
    const app = run("2026-10-27T10:00:00Z");
    app.credit(MINUTE);
    const first = app.ledger;
    app.credit(MINUTE);
    expect(app.ledger).toBe(first);
    app.event({ type: "end", atMs: 2 * MINUTE });
    app.event({
      type: "start",
      id: "b",
      goal: "",
      durationMs: MINUTE,
      atMs: 3 * MINUTE,
    });
    app.event({ type: "tick", atMs: 4 * MINUTE });
    expect(focusOnDay(app.ledger, "2026-10-27")).toBe(3 * MINUTE);
    expect(app.ledger.sessions.map((s) => [s.goal, s.endReason])).toEqual([
      ["study", "ended"],
      ["", "completed"],
    ]);
  });

  it("splits a delayed midnight tick and caps a delayed completion at its deadline", () => {
    vi.stubEnv("TZ", "America/Chicago");
    const app = run("2026-10-27T23:59:30-05:00", MINUTE);
    app.event({ type: "tick", atMs: 5 * MINUTE });
    expect(focusOnDay(app.ledger, "2026-10-27")).toBe(30_000);
    expect(focusOnDay(app.ledger, "2026-10-28")).toBe(30_000);
    expect(app.ledger.sessions[0]?.endedAtMs).toBe(
      Date.parse("2026-10-28T00:00:30-05:00"),
    );
  });

  it("excludes a pause across midnight and records separate running intervals", () => {
    vi.stubEnv("TZ", "America/Chicago");
    const app = run("2026-10-27T23:58:00-05:00");
    app.event({ type: "pause", atMs: MINUTE });
    app.credit(5 * MINUTE);
    app.event({ type: "resume", atMs: 10 * MINUTE });
    app.event({ type: "end", atMs: 11 * MINUTE });
    expect(focusOnDay(app.ledger, "2026-10-27")).toBe(MINUTE);
    expect(focusOnDay(app.ledger, "2026-10-28")).toBe(MINUTE);
    expect(app.ledger.sessions[0]?.intervals).toHaveLength(2);
  });

  it.each([
    ["spring forward", "2026-03-08T01:30:00-06:00", "2026-03-08"],
    ["fall back", "2026-11-01T01:30:00-05:00", "2026-11-01"],
  ])("counts one real hour through %s", (_, start, day) => {
    vi.stubEnv("TZ", "America/Chicago");
    const app = run(start);
    app.event({ type: "end", atMs: 60 * MINUTE });
    expect(focusOnDay(app.ledger, day)).toBe(60 * MINUTE);
    expect(app.ledger.sessions[0]?.intervals[0]?.clockAdjusted).toBe(false);
  });

  it.each([
    ["2026-03-09", "2026-03-08T23:30:00-05:00"],
    ["2026-11-02", "2026-11-01T23:30:00-06:00"],
  ])(
    "uses the calendar boundary at the end of a DST day (%s)",
    (nextDay, start) => {
      vi.stubEnv("TZ", "America/Chicago");
      const app = run(start);
      app.event({ type: "end", atMs: 60 * MINUTE });
      expect(focusOnDay(app.ledger, start.slice(0, 10))).toBe(30 * MINUTE);
      expect(focusOnDay(app.ledger, nextDay)).toBe(30 * MINUTE);
    },
  );

  it("reaggregates stored UTC intervals after changing the system timezone", () => {
    vi.stubEnv("TZ", "UTC");
    const app = run("2026-10-28T00:00:00Z");
    app.event({ type: "end", atMs: MINUTE });
    expect(focusOnDay(app.ledger, "2026-10-28")).toBe(MINUTE);
    vi.stubEnv("TZ", "America/Chicago");
    expect(focusOnDay(app.ledger, "2026-10-27")).toBe(MINUTE);
    expect(focusOnDay(app.ledger, "2026-10-28")).toBe(0);
    expect(app.ledger.sessions[0]?.intervals[0]?.timeZone).toBe("UTC");
  });

  it.each([60 * MINUTE, -60 * MINUTE])(
    "preserves monotonic duration through a wall-clock jump of %s ms",
    (jump) => {
      vi.stubEnv("TZ", "UTC");
      const origin = Date.parse("2026-10-27T12:00:00Z");
      const app = run("2026-10-27T12:00:00Z");
      app.credit(MINUTE);
      app.event({ type: "end", atMs: 2 * MINUTE }, origin + 2 * MINUTE + jump);
      expect(focusOnDay(app.ledger, "2026-10-27")).toBe(2 * MINUTE);
      expect(app.ledger.sessions[0]?.intervals).toHaveLength(2);
      expect(app.ledger.sessions[0]?.intervals[1]?.clockAdjusted).toBe(true);
    },
  );

  it("merges tick samples despite wall-clock rounding but never merges across a short pause", () => {
    const origin = Date.parse("2026-10-27T12:00:00Z");
    const app = run("2026-10-27T12:00:00Z");
    for (let tick = 1; tick <= 100; tick++)
      app.credit(tick * 1000, origin + tick * 1000 + (tick % 2));
    expect(app.ledger.sessions[0]?.intervals).toHaveLength(1);
    app.event({ type: "pause", atMs: 100_000 });
    app.event({ type: "resume", atMs: 100_100 });
    app.event({ type: "end", atMs: 101_100 });
    expect(app.ledger.sessions[0]?.intervals).toHaveLength(2);
  });

  it("records quit while paused without adding time and retains legacy dates", () => {
    vi.stubEnv("TZ", "UTC");
    const app = run("2026-10-27T12:00:00Z");
    app.event({ type: "pause", atMs: MINUTE });
    app.credit(10 * MINUTE, undefined, true);
    expect(app.ledger.sessions[0]?.endReason).toBe("quit");
    expect(
      focusOnDay(
        { ...app.ledger, legacyDays: { "2026-10-27": MINUTE } },
        "2026-10-27",
      ),
    ).toBe(2 * MINUTE);
    expect(localDayKey(new Date(2026, 0, 5).getTime())).toBe("2026-01-05");
  });
});
