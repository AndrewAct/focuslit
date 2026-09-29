import type {
  BridgeStatusView,
  SessionCommand,
  SessionViewDto,
} from "@focuslit/contracts";
import type { CloseTestTabResult } from "../preload";

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
      getBridgeStatus(): Promise<BridgeStatusView>;
      onBridgeChanged(callback: (status: BridgeStatusView) => void): () => void;
      closeTestTab(): Promise<CloseTestTabResult>;
    };
  }
}
