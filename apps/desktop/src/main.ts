import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { app, BrowserWindow, ipcMain, powerMonitor, screen } from "electron";
import { sessionCommandSchema } from "@focuslit/contracts";
import { initialSession, sessionView, transition } from "@focuslit/core";
import { BridgeServer } from "./bridge/server";

// Forces app.getPath("userData") to "~/Library/Application Support/FocusLit"
// in both `pnpm dev` and a packaged build — Electron would otherwise derive
// the name from whichever package.json ends up bundled, which varies with
// packaging and would silently break the Chrome native-messaging host's
// hardcoded socket path (native/macos/chrome-host/host.mjs) if it drifted.
app.setName("FocusLit");

type WindowMode = "collapsed" | "collapsed-timer" | "expanded";
const WINDOW_SIZES: Record<WindowMode, { width: number; height: number }> = {
  collapsed: { width: 148, height: 148 },
  "collapsed-timer": { width: 148, height: 180 },
  expanded: { width: 320, height: 460 },
};
const EDGE_MARGIN = 24;

let mainWindow: BrowserWindow | null = null;
let state = initialSession;
const bridgeServer = new BridgeServer(app.getPath("userData"), () =>
  publishBridgeStatus(),
);

function currentView() {
  return sessionView(state, performance.now());
}

// A BrowserWindow can outlive the renderer frame briefly (notably while Vite
// reloads it or the app is quitting). Do not let timer/bridge notifications
// send into that disposed frame; there is no state to recover because the
// renderer requests a fresh snapshot when its next frame mounts.
function sendToRenderer(channel: string, payload: unknown): void {
  const window = mainWindow;
  if (!window || window.isDestroyed()) return;

  const contents = window.webContents;
  if (contents.isDestroyed() || contents.mainFrame.isDestroyed()) return;

  try {
    contents.send(channel, payload);
  } catch {
    // Frame teardown can race the checks above. A later renderer gets its
    // authoritative snapshot through the corresponding IPC getter.
  }
}

function publish() {
  sendToRenderer("session:changed", currentView());
}

function publishBridgeStatus() {
  sendToRenderer("bridge:changed", bridgeServer.getStatus());
}

function authorized(
  event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent,
): boolean {
  return (
    mainWindow !== null &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

function defaultCollapsedBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  const size = WINDOW_SIZES.collapsed;
  return {
    width: size.width,
    height: size.height,
    x: workArea.x + workArea.width - size.width - EDGE_MARGIN,
    y: workArea.y + workArea.height - size.height - EDGE_MARGIN,
  };
}

function applyWindowMode(window: BrowserWindow, mode: WindowMode) {
  const current = window.getBounds();
  const size = WINDOW_SIZES[mode];
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  const { workArea } = screen.getDisplayNearestPoint({
    x: centerX,
    y: centerY,
  });
  const x = Math.round(
    Math.min(
      Math.max(centerX - size.width / 2, workArea.x),
      workArea.x + workArea.width - size.width,
    ),
  );
  const y = Math.round(
    Math.min(
      Math.max(centerY - size.height / 2, workArea.y),
      workArea.y + workArea.height - size.height,
    ),
  );
  window.setBounds({ x, y, width: size.width, height: size.height });
}

function createWindow() {
  const window = new BrowserWindow({
    ...defaultCollapsedBounds(),
    title: "FocusLit",
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  mainWindow = window;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app.whenReady().then(() => {
  ipcMain.handle("session:get", (event) => {
    if (!authorized(event)) throw new Error("Unauthorized IPC sender");
    return currentView();
  });
  ipcMain.handle("bridge:getStatus", (event) => {
    if (!authorized(event)) throw new Error("Unauthorized IPC sender");
    return bridgeServer.getStatus();
  });
  ipcMain.handle("bridge:closeTestTab", (event) => {
    if (!authorized(event)) throw new Error("Unauthorized IPC sender");
    return bridgeServer.requestCloseTestTab();
  });
  ipcMain.handle("window:setMode", (event, raw: unknown) => {
    if (!authorized(event)) throw new Error("Unauthorized IPC sender");
    if (raw !== "collapsed" && raw !== "collapsed-timer" && raw !== "expanded")
      return;
    if (mainWindow) applyWindowMode(mainWindow, raw);
  });
  ipcMain.on("window:moveBy", (event, dx: unknown, dy: unknown) => {
    if (!authorized(event) || !mainWindow) return;
    if (typeof dx !== "number" || typeof dy !== "number") return;
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({
      x: Math.round(bounds.x + dx),
      y: Math.round(bounds.y + dy),
      width: bounds.width,
      height: bounds.height,
    });
  });
  ipcMain.handle("session:command", (event, raw: unknown) => {
    if (!authorized(event)) throw new Error("Unauthorized IPC sender");
    const command = sessionCommandSchema.parse(raw);
    const atMs = performance.now();
    switch (command.type) {
      case "start":
        state = transition(state, {
          type: "start",
          id: randomUUID(),
          goal: command.goal,
          durationMs: command.durationMinutes * 60_000,
          atMs,
        });
        break;
      default:
        state = transition(state, { type: command.type, atMs });
    }
    publish();
    return currentView();
  });
  powerMonitor.on("suspend", pauseForSystem);
  powerMonitor.on("lock-screen", pauseForSystem);
  setInterval(() => {
    const next = transition(state, { type: "tick", atMs: performance.now() });
    if (next !== state) state = next;
    publish();
  }, 1000);
  createWindow();
  bridgeServer.start();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => bridgeServer.stop());

function pauseForSystem() {
  state = transition(state, { type: "pause", atMs: performance.now() });
  publish();
}

app.on("window-all-closed", () => app.quit());
