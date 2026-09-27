import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { app, BrowserWindow, ipcMain, powerMonitor } from "electron";
import { sessionCommandSchema } from "@focuslit/contracts";
import { initialSession, sessionView, transition } from "@focuslit/core";

let mainWindow: BrowserWindow | null = null;
let state = initialSession;

function currentView() {
  return sessionView(state, performance.now());
}

function publish() {
  mainWindow?.webContents.send("session:changed", currentView());
}

function authorized(event: Electron.IpcMainInvokeEvent): boolean {
  return (
    mainWindow !== null &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

function createWindow() {
  const window = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 360,
    minHeight: 470,
    title: "FocusLit",
    backgroundColor: "#FAF7F2",
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
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function pauseForSystem() {
  state = transition(state, { type: "pause", atMs: performance.now() });
  publish();
}

app.on("window-all-closed", () => app.quit());
