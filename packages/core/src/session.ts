export type Phase = "idle" | "running" | "paused" | "ended";

export interface SessionState {
  phase: Phase;
  id: string | null;
  goal: string;
  durationMs: number;
  elapsedMs: number;
  startedAtMs: number | null;
  revision: number;
}

export type SessionEvent =
  | {
      type: "start";
      id: string;
      goal: string;
      durationMs: number;
      atMs: number;
    }
  | { type: "pause" | "resume" | "end" | "tick"; atMs: number };

export interface SessionView {
  phase: Phase;
  goal: string;
  remainingMs: number;
  durationMs: number;
  revision: number;
}

export const initialSession: SessionState = {
  phase: "idle",
  id: null,
  goal: "",
  durationMs: 0,
  elapsedMs: 0,
  startedAtMs: null,
  revision: 0,
};

function elapsedAt(state: SessionState, atMs: number): number {
  if (state.phase !== "running" || state.startedAtMs === null)
    return state.elapsedMs;
  // A wall-clock rollback must never increase or erase active time.
  return Math.min(
    state.durationMs,
    state.elapsedMs + Math.max(0, atMs - state.startedAtMs),
  );
}

export function transition(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  switch (event.type) {
    case "start": {
      if (state.phase === "running" || state.phase === "paused") return state;
      if (
        !event.id ||
        !event.goal.trim() ||
        !Number.isFinite(event.durationMs) ||
        event.durationMs <= 0
      )
        return state;
      return {
        phase: "running",
        id: event.id,
        goal: event.goal.trim(),
        durationMs: event.durationMs,
        elapsedMs: 0,
        startedAtMs: event.atMs,
        revision: state.revision + 1,
      };
    }
    case "pause": {
      if (state.phase !== "running") return state;
      const elapsedMs = elapsedAt(state, event.atMs);
      return {
        ...state,
        phase: elapsedMs >= state.durationMs ? "ended" : "paused",
        elapsedMs,
        startedAtMs: null,
        revision: state.revision + 1,
      };
    }
    case "resume":
      if (state.phase !== "paused" || state.elapsedMs >= state.durationMs)
        return state;
      return {
        ...state,
        phase: "running",
        startedAtMs: event.atMs,
        revision: state.revision + 1,
      };
    case "end":
      if (state.phase !== "running" && state.phase !== "paused") return state;
      return {
        ...state,
        phase: "ended",
        elapsedMs: elapsedAt(state, event.atMs),
        startedAtMs: null,
        revision: state.revision + 1,
      };
    case "tick": {
      if (state.phase !== "running") return state;
      const elapsedMs = elapsedAt(state, event.atMs);
      if (elapsedMs < state.durationMs) return state;
      return {
        ...state,
        phase: "ended",
        elapsedMs,
        startedAtMs: null,
        revision: state.revision + 1,
      };
    }
  }
}

export function sessionView(state: SessionState, atMs: number): SessionView {
  return {
    phase: state.phase,
    goal: state.goal,
    durationMs: state.durationMs,
    remainingMs: Math.max(0, state.durationMs - elapsedAt(state, atMs)),
    revision: state.revision,
  };
}
