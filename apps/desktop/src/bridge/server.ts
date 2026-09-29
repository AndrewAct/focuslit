import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  BRIDGE_PROTOCOL_VERSION,
  bridgeInboundMessageSchema,
  type BridgeStatusView,
  type BrowserConnectionStatus,
  type CloseTabResult,
  type PageIdentity,
} from "@focuslit/contracts";

// Chrome only looks here (per-user, stable channel) for native messaging
// host manifests on macOS. Other channels/OSes are out of scope for M1.
const CHROME_HOST_MANIFEST_PATH = join(
  homedir(),
  "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.focuslit.chromehost.json",
);

// M1 close experiment only: how long a closeTab command stays valid after
// being sent. Short on purpose — a command this old almost certainly
// targets a page state that no longer holds, and the extension re-checks
// the live tab anyway, but this bounds how long a slow/stuck delivery could
// still be acted on. Not tied to any real policy timing (that's M3).
const CLOSE_COMMAND_TTL_MS = 15_000;
const MAX_SOCKET_FRAME_CHARS = 64 * 1024;

type ChromeRuntimeStatus = "pending" | "connected" | "disconnected";

type ConnectionState = {
  handshakeDone: boolean;
  connectionEpoch: string | null;
  buffer: string;
};

// Relays between the Chrome native-messaging host process and this app over
// a local Unix domain socket, newline-delimited JSON (our own framing — not
// Chrome's binary length-prefixed stdio framing, which only exists between
// Chrome and the host process). Only one live connection is tracked at a
// time. A newly handshaken connection retires the prior socket, so late
// packets and its subsequent close cannot demote the newer connection.
export class BridgeServer {
  private server: Server | null = null;
  private readonly socketPath: string;
  private readonly onChange: () => void;
  private chromeRuntimeStatus: ChromeRuntimeStatus = "pending";
  private lastObservedUrl: string | null = null;
  private lastObservedTitle: string | null = null;
  private lastObservedAtMs: number | null = null;
  private lastObservedPage: PageIdentity | null = null;
  private lastCloseResult: CloseTabResult | null = null;
  private activeSocket: Socket | null = null;
  private activeConnectionEpoch: string | null = null;
  private pendingCloseCommandId: string | null = null;

  constructor(userDataDir: string, onChange: () => void) {
    this.socketPath = join(userDataDir, "bridge.sock");
    this.onChange = onChange;
  }

  start(): void {
    mkdirSync(dirname(this.socketPath), { recursive: true });
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        // Stale socket from an unclean exit; listen() below fails loudly
        // if something else genuinely holds this path.
      }
    }
    const server = createServer((socket) => this.handleConnection(socket));
    server.on("error", (err) => {
      console.error("[bridge] socket server error", err);
    });
    // Owner-only: other local users must not be able to connect and pose as
    // the Chrome host. (Same-user processes are still unauthenticated.)
    server.listen(this.socketPath, () => {
      try {
        chmodSync(this.socketPath, 0o600);
      } catch (err) {
        console.error("[bridge] could not restrict socket permissions", err);
      }
    });
    this.server = server;
  }

  stop(): void {
    this.server?.close();
    this.server = null;
    if (existsSync(this.socketPath)) {
      try {
        unlinkSync(this.socketPath);
      } catch {
        // Best-effort cleanup only; app is exiting either way.
      }
    }
  }

  getStatus(): BridgeStatusView {
    return {
      chrome: this.chromeStatus(),
      // No Safari implementation exists yet — never report anything but the
      // honest absence of a bridge (AGENTS.md: no simulated connection).
      safari: "not-installed",
      lastObservedUrl: this.lastObservedUrl,
      lastObservedTitle: this.lastObservedTitle,
      lastObservedAtMs: this.lastObservedAtMs,
      lastCloseResult: this.lastCloseResult,
    };
  }

  // M1 close experiment: ask the extension to close the exact page it most
  // recently told us about. Deliberately does not accept a tabId/url from
  // the caller — the only thing that can ever be targeted is whatever the
  // bridge itself last observed, which (per background.ts) can only ever be
  // the harmless test page. Returns a reason instead of throwing so the
  // renderer can show *why* it didn't send, not just that it didn't.
  requestCloseTestTab(): { ok: true } | { ok: false; reason: string } {
    if (
      !this.activeSocket ||
      this.activeSocket.destroyed ||
      !this.activeConnectionEpoch
    ) {
      return { ok: false, reason: "not-connected" };
    }
    if (!this.lastObservedPage) {
      return { ok: false, reason: "no-observed-page" };
    }
    if (this.pendingCloseCommandId) {
      return { ok: false, reason: "close-request-pending" };
    }
    const command = {
      type: "closeTab" as const,
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: this.activeConnectionEpoch,
      page: this.lastObservedPage,
      expiresAtMs: Date.now() + CLOSE_COMMAND_TTL_MS,
    };
    try {
      this.activeSocket.write(`${JSON.stringify(command)}\n`);
    } catch {
      return { ok: false, reason: "not-connected" };
    }
    this.pendingCloseCommandId = command.commandId;
    this.lastCloseResult = null;
    this.onChange();
    return { ok: true };
  }

  private chromeStatus(): BrowserConnectionStatus {
    if (this.chromeRuntimeStatus !== "pending") return this.chromeRuntimeStatus;
    return existsSync(CHROME_HOST_MANIFEST_PATH) ? "pending" : "not-installed";
  }

  private handleConnection(socket: Socket): void {
    const state: ConnectionState = {
      handshakeDone: false,
      connectionEpoch: null,
      buffer: "",
    };
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      state.buffer += chunk;
      if (state.buffer.length > MAX_SOCKET_FRAME_CHARS) {
        // A newline-delimited protocol still needs an explicit bound: without
        // one, a peer can keep sending a never-terminated line indefinitely.
        socket.destroy();
        return;
      }
      let newlineIndex = state.buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = state.buffer.slice(0, newlineIndex);
        state.buffer = state.buffer.slice(newlineIndex + 1);
        if (line.trim().length > 0) {
          if (line.length > MAX_SOCKET_FRAME_CHARS) {
            socket.destroy();
            return;
          }
          this.handleLine(socket, line, state);
        }
        newlineIndex = state.buffer.indexOf("\n");
      }
    });
    socket.on("close", () => {
      if (this.activeSocket === socket) {
        this.activeSocket = null;
        this.activeConnectionEpoch = null;
        this.pendingCloseCommandId = null;
        this.clearLastObservation();
        this.chromeRuntimeStatus = "disconnected";
        this.onChange();
      }
    });
    // Errors surface as a subsequent 'close'; nothing extra to do here.
    socket.on("error", () => {});
  }

  private handleLine(
    socket: Socket,
    line: string,
    state: ConnectionState,
  ): void {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(line);
    } catch {
      return; // Malformed line from an untrusted process; drop it.
    }
    const result = bridgeInboundMessageSchema.safeParse(parsedJson);
    if (!result.success) return;
    const message = result.data;

    if (message.type === "hello") {
      if (message.protocolVersion !== BRIDGE_PROTOCOL_VERSION) {
        socket.end(
          `${JSON.stringify({
            type: "versionRejected",
            supportedProtocolVersion: BRIDGE_PROTOCOL_VERSION,
          })}\n`,
        );
        return;
      }
      if (message.browser !== "chrome") {
        socket.end();
        return;
      }
      // The bridge has one active Chrome connection in M1. Explicitly retire
      // the old one so a late packet/close cannot affect the new connection.
      if (this.activeSocket && this.activeSocket !== socket) {
        this.activeSocket.end();
      }
      state.handshakeDone = true;
      state.connectionEpoch = message.connectionEpoch;
      this.chromeRuntimeStatus = "connected";
      this.activeSocket = socket;
      this.activeConnectionEpoch = message.connectionEpoch;
      this.pendingCloseCommandId = null;
      this.clearLastObservation();
      socket.write(
        `${JSON.stringify({
          type: "welcome",
          protocolVersion: BRIDGE_PROTOCOL_VERSION,
        })}\n`,
      );
      this.onChange();
      return;
    }

    if (message.protocolVersion !== BRIDGE_PROTOCOL_VERSION) return;

    if (message.type === "tabObserved") {
      if (!this.isActiveConnection(socket, state, message.connectionEpoch)) {
        return;
      }
      this.lastObservedUrl = message.url;
      this.lastObservedTitle = message.title;
      this.lastObservedAtMs = message.observedAtMs;
      this.lastObservedPage = message.page;
      this.onChange();
      return;
    }

    if (message.type === "closeTabOutcome") {
      if (
        !this.isActiveConnection(socket, state, message.connectionEpoch) ||
        message.commandId !== this.pendingCloseCommandId
      ) {
        return;
      }
      this.pendingCloseCommandId = null;
      this.lastCloseResult = message.result;
      this.onChange();
    }
  }

  private isActiveConnection(
    socket: Socket,
    state: ConnectionState,
    messageConnectionEpoch: string,
  ): boolean {
    return (
      state.handshakeDone &&
      state.connectionEpoch === messageConnectionEpoch &&
      this.activeSocket === socket &&
      this.activeConnectionEpoch === messageConnectionEpoch
    );
  }

  private clearLastObservation(): void {
    this.lastObservedUrl = null;
    this.lastObservedTitle = null;
    this.lastObservedAtMs = null;
    this.lastObservedPage = null;
  }
}
