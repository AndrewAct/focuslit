import { contextBridge, ipcRenderer } from "electron";
import { z } from "zod";
import {
  bridgeStatusViewSchema,
  sessionCommandSchema,
  sessionViewSchema,
  type BridgeStatusView,
  type SessionCommand,
  type SessionViewDto,
} from "@focuslit/contracts";

// Local to the desktop<->renderer IPC boundary only — not part of the
// browser-bridge wire protocol in @focuslit/contracts, so it lives here.
const closeTestTabResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), reason: z.string() }),
]);
export type CloseTestTabResult = z.infer<typeof closeTestTabResultSchema>;

const api = {
  getSession: async (): Promise<SessionViewDto> =>
    sessionViewSchema.parse(await ipcRenderer.invoke("session:get")),
  command: async (command: SessionCommand): Promise<SessionViewDto> => {
    const safe = sessionCommandSchema.parse(command);
    return sessionViewSchema.parse(
      await ipcRenderer.invoke("session:command", safe),
    );
  },
  onSessionChanged: (
    callback: (view: SessionViewDto) => void,
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, raw: unknown) => {
      const result = sessionViewSchema.safeParse(raw);
      if (result.success) callback(result.data);
    };
    ipcRenderer.on("session:changed", listener);
    return () => ipcRenderer.removeListener("session:changed", listener);
  },
  setWindowMode: async (
    mode: "collapsed" | "collapsed-timer" | "expanded",
  ): Promise<void> => {
    await ipcRenderer.invoke("window:setMode", mode);
  },
  moveBy: (dx: number, dy: number): void => {
    ipcRenderer.send("window:moveBy", dx, dy);
  },
  getBridgeStatus: async (): Promise<BridgeStatusView> =>
    bridgeStatusViewSchema.parse(await ipcRenderer.invoke("bridge:getStatus")),
  onBridgeChanged: (
    callback: (status: BridgeStatusView) => void,
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, raw: unknown) => {
      const result = bridgeStatusViewSchema.safeParse(raw);
      if (result.success) callback(result.data);
    };
    ipcRenderer.on("bridge:changed", listener);
    return () => ipcRenderer.removeListener("bridge:changed", listener);
  },
  closeTestTab: async (): Promise<CloseTestTabResult> =>
    closeTestTabResultSchema.parse(
      await ipcRenderer.invoke("bridge:closeTestTab"),
    ),
};

contextBridge.exposeInMainWorld("focuslit", api);
