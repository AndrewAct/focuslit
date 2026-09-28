#!/usr/bin/env node
// Chrome native-messaging host for FocusLit's M1 read-only bridge slice.
//
// Deliberately dependency-free: Chrome launches this file directly by
// absolute path (see install.mjs / the generated NativeMessagingHosts
// manifest), outside pnpm/vite, so it can't rely on workspace module
// resolution. It is a dumb relay only — the desktop process (which does
// import @focuslit/contracts) is the real trust boundary and fully
// re-validates every message; this script's own shape checks are just to
// fail fast and stay debuggable, not a security boundary.
//
// Protocol split:
//  - stdin/stdout <-> Chrome: Chrome's native-messaging framing (4-byte
//    little-endian length prefix + UTF-8 JSON), mandated by Chrome.
//  - This process <-> desktop app: our own framing (newline-delimited
//    JSON) over a local Unix domain socket. See apps/desktop/src/bridge/server.ts.
import { createConnection } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

// Must match apps/extension/src/background.ts's HOST_VERSION. Sent in the
// "hello" message; the desktop side doesn't gate on it yet in M1.
const HOST_VERSION = "0.1.0";

// Must match apps/desktop/src/bridge/server.ts's socket path, which is
// pinned to this exact userData directory by an explicit app.setName("FocusLit")
// in apps/desktop/src/main.ts (packaged app name is otherwise not guaranteed).
const SOCKET_PATH = join(
  homedir(),
  "Library/Application Support/FocusLit/bridge.sock",
);

const RECONNECT_DELAY_MS = 2000;

let stdinBuffer = Buffer.alloc(0);
let socket = null;
let socketBuffer = "";
let reconnectTimer = null;
// connectSocket() is async; Chrome can deliver the extension's "hello" via
// stdin before that connection resolves (a real race, not hypothetical —
// Unix socket connects are normally fast enough to win it, which is why
// this can appear to work then intermittently fail). Queue instead of
// dropping so a hello arriving early isn't silently lost. Bounded so a
// desktop app that never comes up can't grow this unboundedly.
let pendingOutbound = [];
const MAX_PENDING_OUTBOUND = 50;

function writeToChrome(message) {
  const json = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

function readFromChrome(onMessage) {
  process.stdin.on("data", (chunk) => {
    stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
    while (stdinBuffer.length >= 4) {
      const length = stdinBuffer.readUInt32LE(0);
      if (stdinBuffer.length < 4 + length) break;
      const body = stdinBuffer.subarray(4, 4 + length);
      stdinBuffer = stdinBuffer.subarray(4 + length);
      try {
        onMessage(JSON.parse(body.toString("utf8")));
      } catch (err) {
        process.stderr.write(`[focuslit-host] bad JSON from Chrome: ${err}\n`);
      }
    }
  });
  // Chrome closes stdin when it disconnects the port (extension unload,
  // service worker idle-out, browser quit); exit cleanly rather than hang.
  process.stdin.on("end", () => process.exit(0));
}

function scheduleReconnect() {
  socket = null;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket();
  }, RECONNECT_DELAY_MS);
}

function connectSocket() {
  const s = createConnection(SOCKET_PATH);
  s.setEncoding("utf8");
  s.on("connect", () => {
    socket = s;
    process.stderr.write("[focuslit-host] connected to desktop app\n");
    for (const message of pendingOutbound) {
      socket.write(`${JSON.stringify(message)}\n`);
    }
    pendingOutbound = [];
  });
  s.on("data", (chunk) => {
    socketBuffer += chunk;
    let newlineIndex = socketBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = socketBuffer.slice(0, newlineIndex);
      socketBuffer = socketBuffer.slice(newlineIndex + 1);
      if (line.trim().length > 0) {
        try {
          writeToChrome(JSON.parse(line));
        } catch (err) {
          process.stderr.write(
            `[focuslit-host] bad JSON from desktop: ${err}\n`,
          );
        }
      }
      newlineIndex = socketBuffer.indexOf("\n");
    }
  });
  s.on("close", scheduleReconnect);
  s.on("error", (err) => {
    process.stderr.write(`[focuslit-host] socket error: ${err.message}\n`);
    // 'close' always follows an 'error' on a net.Socket; reconnect is
    // scheduled there, not here, to avoid double-scheduling.
  });
}

readFromChrome((message) => {
  if (!socket) {
    // Desktop app isn't reachable yet, or (see pendingOutbound comment
    // above) the connection is still in flight. "hello" in particular must
    // not be dropped here — losing it leaves the socket connected but the
    // desktop side never learns of it, stuck at "pending" forever.
    if (pendingOutbound.length < MAX_PENDING_OUTBOUND) {
      pendingOutbound.push(message);
    } else {
      process.stderr.write(
        "[focuslit-host] pending queue full, dropping message — desktop app unreachable too long\n",
      );
    }
    return;
  }
  socket.write(`${JSON.stringify(message)}\n`);
});

process.stderr.write(`[focuslit-host] starting (v${HOST_VERSION})\n`);
connectSocket();

process.on("uncaughtException", (err) => {
  process.stderr.write(`[focuslit-host] uncaught: ${err?.stack ?? err}\n`);
  process.exit(1);
});
