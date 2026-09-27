import { contextBridge, ipcRenderer } from "electron";
import {
  sessionCommandSchema,
  sessionViewSchema,
  type SessionCommand,
  type SessionViewDto,
} from "@focuslit/contracts";

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
};

contextBridge.exposeInMainWorld("focuslit", api);
