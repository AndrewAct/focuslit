import { z } from "zod";

export const sessionCommandSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("start"),
    goal: z.string().trim().min(1).max(240),
    durationMinutes: z.number().int().min(1).max(180),
  }),
  z.strictObject({ type: z.literal("pause") }),
  z.strictObject({ type: z.literal("resume") }),
  z.strictObject({ type: z.literal("end") }),
]);

export type SessionCommand = z.infer<typeof sessionCommandSchema>;

export const sessionViewSchema = z.strictObject({
  phase: z.enum(["idle", "running", "paused", "ended"]),
  goal: z.string(),
  remainingMs: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  revision: z.number().int().nonnegative(),
});

export type SessionViewDto = z.infer<typeof sessionViewSchema>;
