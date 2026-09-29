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

function setActionFeedback(title) {
  return browser.action.setTitle({ title });
}

async function reportTestPageAfterUserAction(tab) {
  if (!tab?.url || !isFocusLitTestPageUrl(tab.url)) {
    await setActionFeedback("Open the FocusLit local fixture page first");
    return;
  }

  const response = await sendNativeMessage({
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

  if (
    !response ||
    response.type !== "safariWelcome" ||
    response.protocolVersion !== PROTOCOL_VERSION
  ) {
    throw new Error("native handler rejected the fixture message");
  }

  await setActionFeedback("Fixture message accepted");
}

// The prior development build showed an OK/! badge as a test-only receipt.
// Clear any badge left by it: persistent toolbar decoration is not part of
// FocusLit's quiet-companion UI.
void browser.action.setBadgeText({ text: "" });

// Apple grants activeTab only after an explicit extension action. The M1
// experiment therefore cannot inspect tabs as the user switches or browses;
// it can inspect just the tab Safari hands to this click handler, and only
// sends it if it is our harmless local fixture.
browser.action.onClicked.addListener((tab) => {
  void reportTestPageAfterUserAction(tab).catch(
    () =>
      // No URL, title, or native error detail reaches browser-visible output.
      // Keep the outcome to an on-hover label, not a persistent decoration.
      void setActionFeedback("Fixture message was not accepted"),
  );
});
