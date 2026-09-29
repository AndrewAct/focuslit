const PROTOCOL_VERSION = 1;
const TEST_PAGE_PATH_MARKER = "/focuslit-safari-test-page/index.html";

function isFocusLitTestPageUrl(url) {
  const pathEnd = url.search(/[?#]/);
  const path = pathEnd === -1 ? url : url.slice(0, pathEnd);
  return path.startsWith("file:///") && path.endsWith(TEST_PAGE_PATH_MARKER);
}

function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendNativeMessage(
      "com.andreweats.focuslit.safari",
      message,
      (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
          return;
        }
        resolve(response);
      },
    );
  });
}

async function reportActiveTestPage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !isFocusLitTestPageUrl(tab.url)) return;

  await sendNativeMessage({
    type: "safariTabObserved",
    protocolVersion: PROTOCOL_VERSION,
    messageId: crypto.randomUUID(),
    page: {
      windowId: tab.windowId,
      tabId: tab.id,
    },
    url: tab.url,
    title: tab.title ?? "",
    observedAtMs: Date.now(),
  });
}

browser.tabs.onActivated.addListener(() => {
  void reportActiveTestPage().catch((error) =>
    console.warn("[focuslit-safari] native message failed", error),
  );
});

browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    !tab.active ||
    (changeInfo.status !== "complete" &&
      changeInfo.title === undefined &&
      changeInfo.url === undefined)
  )
    return;
  void reportActiveTestPage().catch((error) =>
    console.warn("[focuslit-safari] native message failed", error),
  );
});
