import type { SessionCommand, SessionViewDto } from "@focuslit/contracts";

declare global {
  interface Window {
    focuslit: {
      getSession(): Promise<SessionViewDto>;
      command(command: SessionCommand): Promise<SessionViewDto>;
      onSessionChanged(callback: (view: SessionViewDto) => void): () => void;
      setWindowMode(
        mode: "collapsed" | "collapsed-timer" | "expanded",
      ): Promise<void>;
      moveBy(dx: number, dy: number): void;
    };
  }
}
