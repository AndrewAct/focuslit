import { elapsedAt, type SessionState } from "./session";

export interface FocusInterval {
  startMs: number;
  endMs: number;
  activeMs: number;
  timeZone: string;
  clockAdjusted: boolean;
}

export interface FocusSummary {
  id: string;
  goal: string;
  startedAtMs: number;
  endedAtMs: number | null;
  endReason: "completed" | "ended" | "quit" | null;
  intervals: readonly FocusInterval[];
}

export interface FocusLedger {
  // V1 totals have no timestamps. Keep their original dates; do not invent
  // intervals or pretend they can be reaggregated after a timezone change.
  legacyDays: Readonly<Record<string, number>>;
  sessions: readonly FocusSummary[];
}

export interface FocusSample {
  monotonicMs: number;
  wallMs: number;
  timeZone: string;
}

export interface FocusCursor extends FocusSample {
  sessionId: string | null;
  creditedMs: number;
  running: boolean;
  intervalEndMs: number | null;
}

export const emptyLedger: FocusLedger = { legacyDays: {}, sessions: [] };
export const initialCursor: FocusCursor = {
  sessionId: null,
  creditedMs: 0,
  running: false,
  intervalEndMs: null,
  monotonicMs: 0,
  wallMs: 0,
  timeZone: "UTC",
};

export function localDayKey(wallMs: number): string {
  const date = new Date(wallMs);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Sample before AND after transitions using the same clock pair. Before
// captures the old running interval; after establishes the new phase/anchor.
// No clock is read here, so delayed ticks and clock changes are testable.
export function creditFocus(
  ledger: FocusLedger,
  cursor: FocusCursor,
  state: SessionState,
  sample: FocusSample,
  quit = false,
): { ledger: FocusLedger; cursor: FocusCursor } {
  if (state.id === null) return { ledger, cursor };
  const sameSession = cursor.sessionId === state.id;
  const elapsedMs = elapsedAt(state, sample.monotonicMs);
  const creditedMs = sameSession ? cursor.creditedMs : 0;
  const deltaMs = Math.max(0, elapsedMs - creditedMs);
  const index = ledger.sessions.findIndex((session) => session.id === state.id);
  const existing = ledger.sessions[index];
  let summary: FocusSummary = existing ?? {
    id: state.id,
    goal: state.goal,
    startedAtMs: sample.wallMs,
    endedAtMs: null,
    endReason: null,
    intervals: [],
  };
  let intervalEndMs =
    sameSession && cursor.running ? cursor.intervalEndMs : null;

  if (deltaMs > 0) {
    const clockAdjusted =
      !sameSession ||
      Math.abs(
        sample.wallMs -
          cursor.wallMs -
          (sample.monotonicMs - cursor.monotonicMs),
      ) > 1_000;
    // A manual wall-clock change has no knowable exact timestamp. Preserve
    // monotonic duration, anchor this sample at the observed new wall time,
    // and mark it rather than stretch an interval across the clock jump.
    const startMs = clockAdjusted
      ? sample.wallMs - deltaMs
      : (intervalEndMs ?? cursor.wallMs);
    const interval: FocusInterval = {
      startMs,
      endMs: startMs + deltaMs,
      activeMs: deltaMs,
      timeZone: sample.timeZone,
      clockAdjusted,
    };
    const intervals = [...summary.intervals];
    const last = intervals.at(-1);
    if (
      sameSession &&
      cursor.running &&
      last &&
      !clockAdjusted &&
      !last.clockAdjusted &&
      last.timeZone === interval.timeZone &&
      last.endMs === interval.startMs
    ) {
      intervals[intervals.length - 1] = {
        ...last,
        endMs: last.endMs + deltaMs,
        activeMs: last.activeMs + deltaMs,
      };
    } else {
      intervals.push(interval);
    }
    summary = { ...summary, intervals };
    intervalEndMs = interval.endMs;
  }

  if ((state.phase === "ended" || quit) && summary.endReason === null) {
    summary = {
      ...summary,
      endedAtMs:
        state.phase === "ended" && elapsedMs >= state.durationMs
          ? (summary.intervals.at(-1)?.endMs ?? sample.wallMs)
          : sample.wallMs,
      endReason: quit
        ? "quit"
        : elapsedMs >= state.durationMs
          ? "completed"
          : "ended",
    };
  }
  if (summary !== existing) {
    const sessions = [...ledger.sessions];
    if (index < 0) sessions.push(summary);
    else sessions[index] = summary;
    ledger = { ...ledger, sessions };
  }
  return {
    ledger,
    cursor: {
      ...sample,
      sessionId: state.id,
      creditedMs: Math.max(creditedMs, elapsedMs),
      running: state.phase === "running",
      intervalEndMs: state.phase === "running" ? intervalEndMs : null,
    },
  };
}

// Date constructors resolve calendar boundaries in the current system zone.
// Advancing the calendar date (not adding 86,400,000 ms) handles 23/25-hour
// days and zones whose first valid time is later than midnight.
export function focusOnDay(ledger: FocusLedger, dayKey: string): number {
  const parts = dayKey.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const startMs = new Date(year, month - 1, day).getTime();
  const endMs = new Date(year, month - 1, day + 1).getTime();
  let total = ledger.legacyDays[dayKey] ?? 0;
  for (const session of ledger.sessions) {
    for (const interval of session.intervals) {
      const overlap = Math.max(
        0,
        Math.min(endMs, interval.endMs) - Math.max(startMs, interval.startMs),
      );
      total +=
        (overlap / (interval.endMs - interval.startMs)) * interval.activeMs;
    }
  }
  return total;
}
