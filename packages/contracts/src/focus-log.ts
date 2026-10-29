import { z } from "zod";

export const FOCUS_LOG_FILE_VERSION = 2;
const timestamp = z.number().finite().min(-8.64e15).max(8.64e15);
const days = z.record(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.number().nonnegative().finite(),
);
export const legacyFocusLogFileSchema = z.strictObject({
  version: z.literal(1),
  days,
});

const interval = z
  .strictObject({
    startMs: timestamp,
    endMs: timestamp,
    activeMs: z.number().positive().finite(),
    timeZone: z.string().min(1).max(100),
    clockAdjusted: z.boolean(),
  })
  .refine(
    (value) =>
      value.endMs > value.startMs &&
      Math.abs(value.endMs - value.startMs - value.activeMs) < 1,
  );

export const focusLogFileSchema = z
  .strictObject({
    version: z.literal(FOCUS_LOG_FILE_VERSION),
    legacyDays: days,
    sessions: z.array(
      z
        .strictObject({
          id: z.string().min(1),
          goal: z.string().max(240),
          startedAtMs: timestamp,
          endedAtMs: timestamp.nullable(),
          endReason: z.enum(["completed", "ended", "quit"]).nullable(),
          intervals: z.array(interval),
        })
        .refine(
          (session) =>
            (session.endedAtMs === null) === (session.endReason === null),
        ),
    ),
  })
  .refine(
    (value) =>
      new Set(value.sessions.map((session) => session.id)).size ===
      value.sessions.length,
  );
export type FocusLogFile = z.infer<typeof focusLogFileSchema>;
