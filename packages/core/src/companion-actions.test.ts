import { describe, expect, it } from "vitest";
import {
  advanceCompanionAction,
  COMPANION_ACTION_MAX_INTERVAL_MS,
  COMPANION_ACTION_MIN_INTERVAL_MS,
  COMPANION_ACTION_WARMUP_MS,
  initialCompanionActionSchedule,
} from "./companion-actions";

describe("companion action cadence", () => {
  it("waits for ten minutes of active session time before the first action", () => {
    const schedule = initialCompanionActionSchedule();

    expect(
      advanceCompanionAction(
        schedule,
        "running",
        COMPANION_ACTION_WARMUP_MS - 1,
        () => 0,
      ),
    ).toEqual({ schedule, action: null });

    expect(
      advanceCompanionAction(
        schedule,
        "running",
        COMPANION_ACTION_WARMUP_MS,
        () => 0,
      ),
    ).toEqual({
      action: "grooming",
      schedule: {
        nextActionAtElapsedMs:
          COMPANION_ACTION_WARMUP_MS + COMPANION_ACTION_MIN_INTERVAL_MS,
        lastEarWiggle: null,
      },
    });
  });

  it("schedules following actions at a bounded random interval", () => {
    const schedule = initialCompanionActionSchedule();

    const earliest = advanceCompanionAction(
      schedule,
      "running",
      COMPANION_ACTION_WARMUP_MS,
      () => 0,
    );
    const latest = advanceCompanionAction(
      schedule,
      "running",
      COMPANION_ACTION_WARMUP_MS,
      () => 1,
    );

    expect(earliest.schedule.nextActionAtElapsedMs).toBe(
      COMPANION_ACTION_WARMUP_MS + COMPANION_ACTION_MIN_INTERVAL_MS,
    );
    expect(latest.schedule.nextActionAtElapsedMs).toBe(
      COMPANION_ACTION_WARMUP_MS + COMPANION_ACTION_MAX_INTERVAL_MS,
    );
  });

  it("does not trigger while paused and never replays a backlog", () => {
    const schedule = initialCompanionActionSchedule();
    const afterFirstAction = advanceCompanionAction(
      schedule,
      "running",
      COMPANION_ACTION_WARMUP_MS,
      () => 0,
    );
    const whilePaused = advanceCompanionAction(
      afterFirstAction.schedule,
      "paused",
      COMPANION_ACTION_WARMUP_MS + 60_000,
      () => 0,
    );
    expect(whilePaused).toEqual({
      schedule: afterFirstAction.schedule,
      action: null,
    });
    expect(
      advanceCompanionAction(
        whilePaused.schedule,
        "running",
        COMPANION_ACTION_WARMUP_MS + 60_000,
        () => 0,
      ).action,
    ).toBeNull();

    expect(
      advanceCompanionAction(
        schedule,
        "paused",
        COMPANION_ACTION_WARMUP_MS + 60_000,
        () => 0,
      ),
    ).toEqual({ schedule, action: null });

    const afterDelayedRenderer = advanceCompanionAction(
      schedule,
      "running",
      COMPANION_ACTION_WARMUP_MS + 30 * 60_000,
      () => 0,
    );
    expect(afterDelayedRenderer.action).toBe("grooming");
    expect(
      advanceCompanionAction(
        afterDelayedRenderer.schedule,
        "running",
        COMPANION_ACTION_WARMUP_MS + 30 * 60_000,
        () => 0,
      ).action,
    ).toBeNull();
  });

  it("alternates ears whenever the random action chooses an ear wiggle", () => {
    const first = advanceCompanionAction(
      initialCompanionActionSchedule(),
      "running",
      COMPANION_ACTION_WARMUP_MS,
      () => 0.9,
    );
    expect(first.action).toBe("ear-wiggle-left");

    const second = advanceCompanionAction(
      first.schedule,
      "running",
      first.schedule.nextActionAtElapsedMs,
      () => 0.9,
    );
    expect(second.action).toBe("ear-wiggle-right");
  });
});
