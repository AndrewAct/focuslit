import { z } from "zod";

// Bumped whenever a field's meaning changes, not just when one is added.
// The desktop process rejects a lower/higher version instead of guessing
// compatibility (see ARCHITECTURE.md "浏览器协议与动作验证").
export const BRIDGE_PROTOCOL_VERSION = 1;

export const browserKindSchema = z.enum(["chrome", "safari"]);
export type BrowserKind = z.infer<typeof browserKindSchema>;

// One native-host process = one connection epoch. A fresh epoch tells the
// desktop side that any state it inferred from a prior connection (e.g. an
// in-flight observation) no longer has a live sender behind it.
export const bridgeHelloSchema = z.strictObject({
  type: z.literal("hello"),
  protocolVersion: z.number().int().positive(),
  browser: browserKindSchema,
  hostVersion: z.string().min(1).max(64),
  connectionEpoch: z.string().uuid(),
});
export type BridgeHello = z.infer<typeof bridgeHelloSchema>;

// Identifies the exact tab/navigation an observation came from. `tabId` and
// `windowId` are Chrome-assigned and can be reused after a tab/window closes;
// `navigationSeq` is a locally counted sequence per tab (not chrome.webNavigation's
// real navigation id yet), so this is a soft identity, not a durable key.
// Known limitation to revisit before this feeds any close/intervention path.
export const pageIdentitySchema = z.strictObject({
  profileId: z.string().uuid(),
  browserInstanceId: z.string().uuid(),
  windowId: z.number().int(),
  tabId: z.number().int(),
  navigationSeq: z.number().int().nonnegative(),
});
export type PageIdentity = z.infer<typeof pageIdentitySchema>;

// M1 read-only slice: only the extension's own harmless test page is ever
// reported. No page body, no other tabs, no close capability yet.
export const bridgeTabObservedSchema = z.strictObject({
  type: z.literal("tabObserved"),
  protocolVersion: z.number().int().positive(),
  messageId: z.string().uuid(),
  connectionEpoch: z.string().uuid(),
  page: pageIdentitySchema,
  url: z.string().min(1).max(4096),
  title: z.string().max(1024),
  observedAtMs: z.number().nonnegative(),
});
export type BridgeTabObserved = z.infer<typeof bridgeTabObservedSchema>;

// Result of a closeTab attempt. Distinct reasons instead of a single
// boolean so the desktop side (and Andrew, reading the footer) can tell
// "worked", "too late to matter" (tabNotFound), "page moved under us"
// (navigationMismatch), and "this command shouldn't be trusted" (expired,
// connectionMismatch) apart — see ARCHITECTURE.md's close flow, steps 3-5.
export const closeTabResultSchema = z.enum([
  "closed",
  "tabNotFound",
  "navigationMismatch",
  "expired",
  "connectionMismatch",
  "rejected",
]);
export type CloseTabResult = z.infer<typeof closeTabResultSchema>;

export const closeTabOutcomeSchema = z.strictObject({
  type: z.literal("closeTabOutcome"),
  protocolVersion: z.number().int().positive(),
  commandId: z.string().uuid(),
  connectionEpoch: z.string().uuid(),
  result: closeTabResultSchema,
});
export type CloseTabOutcome = z.infer<typeof closeTabOutcomeSchema>;

export const bridgeInboundMessageSchema = z.discriminatedUnion("type", [
  bridgeHelloSchema,
  bridgeTabObservedSchema,
  closeTabOutcomeSchema,
]);
export type BridgeInboundMessage = z.infer<typeof bridgeInboundMessageSchema>;

export const bridgeWelcomeSchema = z.strictObject({
  type: z.literal("welcome"),
  protocolVersion: z.number().int().positive(),
});

export const bridgeVersionRejectedSchema = z.strictObject({
  type: z.literal("versionRejected"),
  supportedProtocolVersion: z.number().int().positive(),
});

// M1 close experiment only: desktop asks the extension to close one exact
// page it already told us about (page identity comes from the most recent
// tabObserved, not from desktop's own imagination). connectionEpoch and
// expiresAtMs are the two things that make a stale command inert — a
// reconnect changes the epoch, and an old command simply times out.
export const closeTabCommandSchema = z.strictObject({
  type: z.literal("closeTab"),
  protocolVersion: z.number().int().positive(),
  commandId: z.string().uuid(),
  connectionEpoch: z.string().uuid(),
  page: pageIdentitySchema,
  expiresAtMs: z.number().nonnegative(),
});
export type CloseTabCommand = z.infer<typeof closeTabCommandSchema>;

export const bridgeOutboundMessageSchema = z.discriminatedUnion("type", [
  bridgeWelcomeSchema,
  bridgeVersionRejectedSchema,
  closeTabCommandSchema,
]);
export type BridgeOutboundMessage = z.infer<typeof bridgeOutboundMessageSchema>;

// - not-installed: no native-messaging host manifest found for this browser.
// - pending: host manifest present, but no connection observed yet this run.
// - connected: an active socket connection completed a valid hello.
// - disconnected: connected before, socket is now closed.
// This is computed from real filesystem/socket state, never asserted.
export const browserConnectionStatusSchema = z.enum([
  "not-installed",
  "pending",
  "connected",
  "disconnected",
]);
export type BrowserConnectionStatus = z.infer<
  typeof browserConnectionStatusSchema
>;

export const bridgeStatusViewSchema = z.strictObject({
  chrome: browserConnectionStatusSchema,
  // Safari bridge has no implementation yet in M1's first slice; this is
  // always "not-installed" until native/macos work starts, never simulated.
  safari: browserConnectionStatusSchema,
  lastObservedUrl: z.string().max(4096).nullable(),
  lastObservedTitle: z.string().max(1024).nullable(),
  lastObservedAtMs: z.number().nonnegative().nullable(),
  // Surfaced so the M1 close-experiment control in the UI can show what
  // happened without needing the service worker console open.
  lastCloseResult: closeTabResultSchema.nullable(),
});
export type BridgeStatusView = z.infer<typeof bridgeStatusViewSchema>;
