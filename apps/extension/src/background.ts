import {
  BRIDGE_PROTOCOL_VERSION,
  bridgeOutboundMessageSchema,
  type BridgeOutboundMessage,
  type CloseTabCommand,
  type CloseTabResult,
} from "@focuslit/contracts";
import { isFocusLitTestPageUrl } from "./test-page";

const NATIVE_HOST_NAME = "com.focuslit.chromehost";
// Must match native/macos/chrome-host/host.mjs's HOST_VERSION — informational
// only, the desktop side does not gate on it yet.
const HOST_VERSION = "0.1.0";
// M1 read-only scope: only ever report the extension's own harmless test
// page, never a real tab. This is enforced here, not just by Andrew choosing
// what to navigate to during testing.

let port: chrome.runtime.Port | null = null;
let connectionEpoch = "";
let profileIdPromise: Promise<string> | null = null;
let browserInstanceIdPromise: Promise<string> | null = null;
const navigationSeqByTab = new Map<number, number>();

// Persists across service-worker sleep/wake (chrome.storage.local survives
// full browser restarts too) — this is "the same Chrome profile" identity.
async function getProfileId(): Promise<string> {
  profileIdPromise ??= (async () => {
    const stored = await chrome.storage.local.get("profileId");
    if (typeof stored.profileId === "string") return stored.profileId;
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ profileId: id });
    return id;
  })();
  return profileIdPromise;
}

// chrome.storage.session survives worker sleep/wake but clears when the
// browser fully quits — approximates "this browser launch" identity, as
// distinct from the per-connection connectionEpoch below.
async function getBrowserInstanceId(): Promise<string> {
  browserInstanceIdPromise ??= (async () => {
    const stored = await chrome.storage.session.get("browserInstanceId");
    if (typeof stored.browserInstanceId === "string")
      return stored.browserInstanceId;
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ browserInstanceId: id });
    return id;
  })();
  return browserInstanceIdPromise;
}

function getPort(): chrome.runtime.Port {
  if (port) return port;
  connectionEpoch = crypto.randomUUID();
  console.debug("[focuslit] connecting to native host", NATIVE_HOST_NAME);
  const nextPort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  nextPort.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.warn(
        "[focuslit] native host disconnected:",
        chrome.runtime.lastError.message,
      );
    }
    port = null;
  });
  nextPort.onMessage.addListener((raw: unknown) => {
    const result = bridgeOutboundMessageSchema.safeParse(raw);
    if (result.success) handleOutbound(result.data);
  });
  port = nextPort;
  nextPort.postMessage({
    type: "hello",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    browser: "chrome",
    hostVersion: HOST_VERSION,
    connectionEpoch,
  });
  return nextPort;
}

function handleOutbound(message: BridgeOutboundMessage) {
  if (message.type === "versionRejected") {
    console.error(
      `[focuslit] desktop app rejected protocol v${BRIDGE_PROTOCOL_VERSION}; ` +
        `it supports v${message.supportedProtocolVersion}. Not retrying.`,
    );
    port?.disconnect();
    port = null;
    return;
  }
  if (message.type === "closeTab") {
    void handleCloseTab(message);
  }
}

function sendCloseOutcome(commandId: string, result: CloseTabResult) {
  console.debug("[focuslit] closeTab outcome:", result);
  port?.postMessage({
    type: "closeTabOutcome",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    commandId,
    connectionEpoch,
    result,
  });
}

// M1 close experiment. Every check here re-reads live state rather than
// trusting the command's claims (ARCHITECTURE.md: "最接近执行时再读取页面
// 身份；不匹配或不确定则拒绝") — the command is a *request*, not authority
// on its own. The TEST_PAGE_MARKER check in particular is a hard floor:
// even a desktop process that somehow got compromised or buggy cannot make
// this close anything but the harmless test page, because that check runs
// against the tab's *current* real URL, not anything the command asserts.
async function handleCloseTab(command: CloseTabCommand): Promise<void> {
  if (command.protocolVersion !== BRIDGE_PROTOCOL_VERSION) {
    sendCloseOutcome(command.commandId, "rejected");
    return;
  }
  if (command.connectionEpoch !== connectionEpoch) {
    // Command was addressed to a connection that no longer exists (e.g. we
    // reconnected in between) — its authority died with that connection.
    sendCloseOutcome(command.commandId, "connectionMismatch");
    return;
  }
  if (Date.now() > command.expiresAtMs) {
    sendCloseOutcome(command.commandId, "expired");
    return;
  }

  const [profileId, browserInstanceId] = await Promise.all([
    getProfileId(),
    getBrowserInstanceId(),
  ]);
  if (
    command.page.profileId !== profileId ||
    command.page.browserInstanceId !== browserInstanceId
  ) {
    sendCloseOutcome(command.commandId, "navigationMismatch");
    return;
  }

  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(command.page.tabId);
  } catch {
    sendCloseOutcome(command.commandId, "tabNotFound");
    return;
  }
  const currentSeq = navigationSeqByTab.get(command.page.tabId);
  const stillTestPage = Boolean(tab.url && isFocusLitTestPageUrl(tab.url));
  if (
    !stillTestPage ||
    tab.windowId !== command.page.windowId ||
    currentSeq !== command.page.navigationSeq
  ) {
    sendCloseOutcome(command.commandId, "navigationMismatch");
    return;
  }

  try {
    await chrome.tabs.remove(command.page.tabId);
    sendCloseOutcome(command.commandId, "closed");
  } catch {
    // Most likely the tab closed between the chrome.tabs.get() above and
    // this call (e.g. the user closed it by hand); not a real failure.
    sendCloseOutcome(command.commandId, "tabNotFound");
  }
}

async function reportIfTestPage(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  if (!tab.url) {
    // Chrome withholds tab.url entirely (even with the "tabs" permission)
    // for file:// tabs unless "Allow access to file URLs" is enabled for
    // this extension, and for some internal pages (chrome://, the New Tab
    // page). No content beyond that fact is logged.
    console.debug(
      "[focuslit] tab.url unavailable for this tab (file:// access not granted, or a restricted page)",
    );
    return;
  }
  if (!isFocusLitTestPageUrl(tab.url)) return;
  console.debug("[focuslit] test page detected, reporting");
  const tabId = tab.id;
  const seq = (navigationSeqByTab.get(tabId) ?? -1) + 1;
  navigationSeqByTab.set(tabId, seq);
  const [profileId, browserInstanceId] = await Promise.all([
    getProfileId(),
    getBrowserInstanceId(),
  ]);
  try {
    getPort().postMessage({
      type: "tabObserved",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      messageId: crypto.randomUUID(),
      connectionEpoch,
      page: {
        profileId,
        browserInstanceId,
        windowId: tab.windowId ?? -1,
        tabId,
        navigationSeq: seq,
      },
      url: tab.url,
      title: tab.title ?? "",
      observedAtMs: Date.now(),
    });
    console.debug("[focuslit] tabObserved sent");
  } catch (err) {
    console.warn("[focuslit] failed to send tabObserved", err);
  }
}

// Listeners are registered synchronously at top level (not inside async
// callbacks) so Chrome can wake a sleeping MV3 service worker for these
// events instead of silently missing them.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    void reportIfTestPage(tab);
  });
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // `changeInfo.url` covers SPA history updates. Ignore background tabs: M1
  // observes only the active developer fixture, not every matching tab.
  if (
    !tab.active ||
    (changeInfo.status !== "complete" &&
      changeInfo.title === undefined &&
      changeInfo.url === undefined)
  )
    return;
  void reportIfTestPage(tab);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  navigationSeqByTab.delete(tabId);
});
