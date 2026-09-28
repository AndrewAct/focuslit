// The M1 bridge is intentionally restricted to the developer-owned fixture
// loaded from disk. A substring check alone would accept an unrelated remote
// URL such as `https://example.test/?next=/focuslit-test-page/` and weaken the
// claim that this experiment can only observe/close a harmless test tab.
export const TEST_PAGE_PATH_MARKER = "/focuslit-test-page/index.html";

export function isFocusLitTestPageUrl(url: string): boolean {
  const pathEnd = url.search(/[?#]/);
  const path = pathEnd === -1 ? url : url.slice(0, pathEnd);
  return path.startsWith("file:///") && path.endsWith(TEST_PAGE_PATH_MARKER);
}

// Known limit: the extension cannot know the checkout's absolute path, so any
// local file named .../focuslit-test-page/index.html still matches. Pin the
// full path from install.mjs before this may act on anything but the fixture.
