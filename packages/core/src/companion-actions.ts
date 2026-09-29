import type { Phase } from "./session";

// A companion action is deliberately driven by active session time, rather
// than wall time. Pausing, sleep, and a hidden app therefore cannot make the
// pet "catch up" with several actions when the user returns.
export const COMPANION_ACTION_WARMUP_MS = 10 * 60_000;
export const COMPANION_ACTION_MIN_INTERVAL_MS = 5 * 60_000;
export const COMPANION_ACTION_MAX_INTERVAL_MS = 10 * 60_000;

export type CompanionAction =
  "grooming" | "yawning" | "ear-wiggle-left" | "ear-wiggle-right";

export interface CompanionActionSchedule {
  nextActionAtElapsedMs: number;
  lastEarWiggle: "left" | "right" | null;
}

export interface CompanionActionStep {
  schedule: CompanionActionSchedule;
  action: CompanionAction | null;
}

export type RandomSource = () => number;

export function initialCompanionActionSchedule(): CompanionActionSchedule {
  return {
    nextActionAtElapsedMs: COMPANION_ACTION_WARMUP_MS,
    lastEarWiggle: null,
  };
}

function unitFrom(random: RandomSource): number {
  // Clamp an injected source as a defensive boundary: a test double or a
  // future persisted source must never make a companion action invalid.
  return Math.min(1, Math.max(0, random()));
}

function intervalFrom(random: RandomSource): number {
  const unit = unitFrom(random);
  return Math.round(
    COMPANION_ACTION_MIN_INTERVAL_MS +
      unit *
        (COMPANION_ACTION_MAX_INTERVAL_MS - COMPANION_ACTION_MIN_INTERVAL_MS),
  );
}

function actionFrom(
  schedule: CompanionActionSchedule,
  random: RandomSource,
): CompanionAction {
  const unit = unitFrom(random);
  if (unit < 1 / 3) return "grooming";
  if (unit < 2 / 3) return "yawning";
  return schedule.lastEarWiggle === "left"
    ? "ear-wiggle-right"
    : "ear-wiggle-left";
}

/**
 * Advance the low-frequency companion cadence once for a session snapshot.
 *
 * Only a running session may emit an action. When the renderer is delayed,
 * one due action is emitted and the following one is scheduled from the
 * current active elapsed time; it never bursts to compensate for missed time.
 */
export function advanceCompanionAction(
  schedule: CompanionActionSchedule,
  phase: Phase,
  elapsedMs: number,
  random: RandomSource,
): CompanionActionStep {
  if (phase !== "running" || elapsedMs < schedule.nextActionAtElapsedMs) {
    return { schedule, action: null };
  }

  const action = actionFrom(schedule, random);
  return {
    action,
    schedule: {
      nextActionAtElapsedMs: elapsedMs + intervalFrom(random),
      lastEarWiggle:
        action === "ear-wiggle-left"
          ? "left"
          : action === "ear-wiggle-right"
            ? "right"
            : schedule.lastEarWiggle,
    },
  };
}
