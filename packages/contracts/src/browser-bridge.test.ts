import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BRIDGE_PROTOCOL_VERSION,
  bridgeInboundMessageSchema,
  bridgeOutboundMessageSchema,
} from "./browser-bridge";

describe("browser bridge inbound protocol", () => {
  it("accepts a well-formed hello", () => {
    const result = bridgeInboundMessageSchema.safeParse({
      type: "hello",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      browser: "chrome",
      hostVersion: "0.1.0",
      connectionEpoch: randomUUID(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a tabObserved with extra authority-looking fields", () => {
    const result = bridgeInboundMessageSchema.safeParse({
      type: "tabObserved",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      messageId: randomUUID(),
      connectionEpoch: randomUUID(),
      page: {
        profileId: randomUUID(),
        browserInstanceId: randomUUID(),
        windowId: 1,
        tabId: 2,
        navigationSeq: 0,
      },
      url: "https://example.com/test-page",
      title: "FocusLit test page",
      observedAtMs: 0,
      closeAuthorized: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown message type", () => {
    const result = bridgeInboundMessageSchema.safeParse({
      type: "closeTab",
      tabId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed closeTabOutcome", () => {
    const result = bridgeInboundMessageSchema.safeParse({
      type: "closeTabOutcome",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: randomUUID(),
      result: "navigationMismatch",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a closeTabOutcome with a made-up result value", () => {
    const result = bridgeInboundMessageSchema.safeParse({
      type: "closeTabOutcome",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: randomUUID(),
      result: "definitely-closed-trust-me",
    });
    expect(result.success).toBe(false);
  });
});

describe("browser bridge outbound protocol", () => {
  it("accepts a well-formed closeTab command", () => {
    const result = bridgeOutboundMessageSchema.safeParse({
      type: "closeTab",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: randomUUID(),
      page: {
        profileId: randomUUID(),
        browserInstanceId: randomUUID(),
        windowId: 1,
        tabId: 2,
        navigationSeq: 0,
      },
      expiresAtMs: Date.now() + 15_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a closeTab command missing its expiry", () => {
    const result = bridgeOutboundMessageSchema.safeParse({
      type: "closeTab",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: randomUUID(),
      page: {
        profileId: randomUUID(),
        browserInstanceId: randomUUID(),
        windowId: 1,
        tabId: 2,
        navigationSeq: 0,
      },
    });
    expect(result.success).toBe(false);
  });
});
