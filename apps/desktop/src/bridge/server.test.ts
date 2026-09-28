import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BRIDGE_PROTOCOL_VERSION } from "@focuslit/contracts";
import { BridgeServer } from "./server";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createBridge() {
  const userDataDir = mkdtempSync("/private/tmp/focuslit-bridge-");
  tempDirs.push(userDataDir);
  const bridge = new BridgeServer(userDataDir, () => {});
  bridge.start();
  return { bridge, socketPath: join(userDataDir, "bridge.sock") };
}

async function connect(socketPath: string): Promise<Socket> {
  const socket = createConnection(socketPath);
  await once(socket, "connect");
  return socket;
}

function send(socket: Socket, message: unknown): void {
  socket.write(`${JSON.stringify(message)}\n`);
}

async function nextMessage(socket: Socket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    socket.setEncoding("utf8");
    const onData = (chunk: string) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) return;
      cleanup();
      resolve(JSON.parse(buffer.slice(0, newlineIndex)));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

function hello(connectionEpoch: string) {
  return {
    type: "hello",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    browser: "chrome",
    hostVersion: "test",
    connectionEpoch,
  };
}

function observation(connectionEpoch: string) {
  return {
    type: "tabObserved",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    messageId: randomUUID(),
    connectionEpoch,
    page: {
      profileId: randomUUID(),
      browserInstanceId: randomUUID(),
      windowId: 1,
      tabId: 2,
      navigationSeq: 0,
    },
    url: "file:///focuslit-test-page/index.html",
    title: "FocusLit test page",
    observedAtMs: Date.now(),
  };
}

describe("BridgeServer connection authority", () => {
  it("only accepts an observation from the active handshake epoch", async () => {
    const { bridge, socketPath } = createBridge();
    const socket = await connect(socketPath);
    const epoch = randomUUID();
    const welcome = nextMessage(socket);
    send(socket, hello(epoch));
    await expect(welcome).resolves.toEqual({
      type: "welcome",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
    });

    send(socket, observation(randomUUID()));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.getStatus().lastObservedUrl).toBeNull();

    send(socket, observation(epoch));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.getStatus().lastObservedUrl).toContain("focuslit-test-page");

    socket.destroy();
    bridge.stop();
  });

  it("ignores stale sockets and only records the pending command's outcome", async () => {
    const { bridge, socketPath } = createBridge();
    const staleSocket = await connect(socketPath);
    const staleEpoch = randomUUID();
    const staleWelcome = nextMessage(staleSocket);
    send(staleSocket, hello(staleEpoch));
    await staleWelcome;

    const activeSocket = await connect(socketPath);
    const activeEpoch = randomUUID();
    const activeWelcome = nextMessage(activeSocket);
    send(activeSocket, hello(activeEpoch));
    await activeWelcome;
    await once(staleSocket, "close");
    expect(bridge.getStatus().chrome).toBe("connected");

    send(activeSocket, observation(activeEpoch));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const commandPromise = nextMessage(activeSocket);
    expect(bridge.requestCloseTestTab()).toEqual({ ok: true });
    const command = await commandPromise;
    expect(command).toMatchObject({
      type: "closeTab",
      connectionEpoch: activeEpoch,
    });

    send(activeSocket, {
      type: "closeTabOutcome",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId: randomUUID(),
      connectionEpoch: activeEpoch,
      result: "closed",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.getStatus().lastCloseResult).toBeNull();

    const commandId = (command as { commandId: string }).commandId;
    send(activeSocket, {
      type: "closeTabOutcome",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      commandId,
      connectionEpoch: activeEpoch,
      result: "closed",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bridge.getStatus().lastCloseResult).toBe("closed");

    activeSocket.destroy();
    bridge.stop();
  });
});
